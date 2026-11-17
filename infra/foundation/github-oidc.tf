# Lets GitHub Actions use AWS without any stored AWS keys.
#
# How it works on each workflow run:
# 1. The job asks GitHub for a signed token (a JWT). It says which repo,
#    branch or environment the job runs for.
# 2. The job sends that token to AWS STS and asks to assume the role below.
# 3. STS checks the signature against this OIDC provider and checks the
#    token's claims against the role's trust policy.
# 4. If both pass, STS returns credentials that expire after an hour.
#
# Nothing secret is stored in GitHub, and a leaked token is useless an hour
# later.

# Registers GitHub as an identity provider this AWS account trusts. There
# can only be one provider per URL per account.
resource "aws_iam_openid_connect_provider" "github" {
  # The issuer of GitHub's tokens (their `iss` claim).
  url = "https://token.actions.githubusercontent.com"

  # The audience (`aud` claim) the tokens must carry. The official
  # aws-actions/configure-aws-credentials action requests this value.
  client_id_list = ["sts.amazonaws.com"]

  # No thumbprint_list: for GitHub, AWS validates the certificate against its
  # own trusted root CAs and ignores thumbprints.
}

# The trust policy: WHO may assume the role, and under which conditions.
data "aws_iam_policy_document" "github_trust" {
  statement {
    # The STS action used to swap an OIDC token for AWS credentials.
    actions = ["sts:AssumeRoleWithWebIdentity"]

    # Only tokens issued by the GitHub provider above.
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    # The token must be meant for AWS STS, not some other service.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # The token's subject (`sub` claim) must name this repo, and either the
    # main branch or a GitHub environment. A PR from a fork, or any other
    # branch, gets a different subject and is refused.
    condition {
      test     = "StringLike" # StringLike allows the * wildcard
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        # Jobs on main without an environment, such as building and pushing.
        "repo:${local.github_repo}:ref:refs/heads/main",
        # Jobs with `environment: dev|qa|prod`. GitHub replaces the branch in
        # the subject with the environment name, so this needs its own entry.
        "repo:${local.github_repo}:environment:*",
      ]
    }
  }
}

# The role the release workflow assumes.
resource "aws_iam_role" "github_deploy" {
  name = "${local.name}-github-deploy"

  # Attaches the trust policy above.
  assume_role_policy = data.aws_iam_policy_document.github_trust.json

  # Credentials last at most 1 hour, which is the default; a deploy takes
  # minutes.
  max_session_duration = 3600
}

# The permissions policy: WHAT the role may do once assumed. For now only
# pushing images. Steps 9 and 13 add deploy permissions.
data "aws_iam_policy_document" "github_deploy" {
  statement {
    # Returns the temporary password for `docker login` to ECR. This API
    # isn't tied to a repository, so it only works with resource "*".
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "EcrPushPull"
    actions = [
      # Lets docker skip layers the repository already has.
      "ecr:BatchCheckLayerAvailability",
      # The three calls that upload one image layer in parts.
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      # Writes the manifest, which creates the tag.
      "ecr:PutImage",
      # Reads manifests and layers, needed for build caching and to check
      # that a tag already exists.
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
      # Lets the workflow check whether a version was already pushed.
      "ecr:DescribeImages",
    ]
    # Only this one repository, not every repository in the account.
    resources = [aws_ecr_repository.app.arn]
  }
}

# Attaches the permissions to the role as an inline policy. Inline means it
# lives and dies with the role and can't be attached anywhere else by
# mistake.
resource "aws_iam_role_policy" "github_deploy" {
  name   = "ecr-push"
  role   = aws_iam_role.github_deploy.id
  policy = data.aws_iam_policy_document.github_deploy.json
}

# The private Docker registry for the app image. The release workflow pushes
# here once per version, and every environment pulls the same image from it.
resource "aws_ecr_repository" "app" {
  # The repository name. The full image address becomes
  # <account>.dkr.ecr.ap-south-1.amazonaws.com/pocket-wisdom:<tag>.
  name = local.name

  # Once a tag such as v1.4.0 is pushed, pushing another image with the same
  # tag fails. Promotion from dev to qa to prod relies on a tag always
  # meaning the same bytes.
  image_tag_mutability = "IMMUTABLE"

  # Without this, `terraform destroy` fails while the repository still holds
  # images. Leaving it false protects your images from an accidental destroy;
  # empty the repository by hand when you really want it gone.
  force_delete = false

  image_scanning_configuration {
    # Scans every pushed image for known CVEs in its OS packages. Results
    # show up in the ECR console and `aws ecr describe-image-scan-findings`.
    # Basic scanning is free.
    scan_on_push = true
  }

  encryption_configuration {
    # Encrypts image layers at rest with an AWS-managed key. AES256 is the
    # default and free; KMS would add a key to manage and a per-request cost.
    encryption_type = "AES256"
  }
}

# Rules ECR applies on its own, about once a day, to delete old images and
# keep storage costs down.
data "aws_ecr_lifecycle_policy_document" "app" {
  rule {
    # Lower priority numbers run first. Each image is matched by at most one
    # rule.
    priority    = 1
    description = "Delete untagged images after 7 days"

    selection {
      # Untagged images are leftovers, for example layers from a failed push.
      tag_status = "untagged"

      # Counts age from the push date.
      count_type   = "sinceImagePushed"
      count_unit   = "days"
      count_number = 7
    }

    action {
      # expire means delete.
      type = "expire"
    }
  }

  rule {
    priority    = 2
    description = "Keep only the 30 newest sha- tags"

    selection {
      # Only images with a tag starting with "sha-", the per-commit builds
      # from step 11. Version tags (v1.4.0) match no rule, so they are kept
      # forever and you can always roll back to a release.
      tag_status      = "tagged"
      tag_prefix_list = ["sha-"]

      # When there are more than 30, the oldest are deleted.
      count_type   = "imageCountMoreThan"
      count_number = 30
    }

    action {
      type = "expire"
    }
  }
}

# Attaches the rules above to the repository.
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  # The data source renders the rules as the JSON ECR expects.
  policy = data.aws_ecr_lifecycle_policy_document.app.json
}

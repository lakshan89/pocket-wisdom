# Outputs are the values this stack hands to others. `terraform output`
# prints them, and they're saved in the state file, where infra/env reads
# them through a `terraform_remote_state` data source in step 9.

# infra/env creates security groups, the ALB and RDS inside this VPC.
output "vpc_id" {
  description = "ID of the shared VPC"
  value       = aws_vpc.main.id
}

# The splat `[*].id` collects the id of every copy made by count, in order.
output "public_subnet_ids" {
  description = "Public subnets for the ALB and the app, one per zone"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnets for RDS, one per zone"
  value       = aws_subnet.private[*].id
}

# Used in `docker tag` and `docker push` (step 8) and by the release
# workflow (step 11).
output "ecr_repository_url" {
  description = "Image address without a tag"
  value       = aws_ecr_repository.app.repository_url
}

# Goes into the workflow's `role-to-assume` input. It isn't secret, but
# storing it as a GitHub variable keeps account details out of the YAML.
output "github_deploy_role_arn" {
  description = "Role GitHub Actions assumes through OIDC"
  value       = aws_iam_role.github_deploy.arn
}

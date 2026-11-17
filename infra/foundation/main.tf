# Shared values for this stack. `locals` are constants computed inside the
# configuration; unlike variables, nobody can override them from outside.
# The foundation is applied once per account, so nothing here needs to vary.
locals {
  # Prefix for resource names, so everything for this app sorts together in
  # the console.
  name = "pocket-wisdom"

  # owner/repo on GitHub. The OIDC trust policy only accepts tokens whose
  # subject names this repo, so no other repository can assume the role.
  github_repo = "lakshan89/pocket-wisdom"

  # Address range for the whole VPC: 10.0.0.0 to 10.0.255.255, 65,536
  # addresses. Every subnet below is carved out of it.
  vpc_cidr = "10.0.0.0/16"

  # Two availability zones (separate data centres in ap-south-1). An ALB and
  # an RDS subnet group both refuse to be created with fewer than two.
  azs = ["ap-south-1a", "ap-south-1b"]
}

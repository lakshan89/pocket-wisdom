terraform {
  # 1.10 added S3 native state locking (use_lockfile).
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0" # any 6.x, never 7.0
    }
  }

  # Backend values must be literals: no variables allowed here.
  backend "s3" {
    bucket       = "pocket-wisdom-tfstate"
    key          = "foundation/terraform.tfstate"
    region       = "ap-south-1"
    use_lockfile = true # writes a .tflock object while a run holds the state
    encrypt      = true
  }
}

provider "aws" {
  region = "ap-south-1"

  # Added to every resource this provider creates.
  default_tags {
    tags = {
      Project   = "pocket-wisdom"
      ManagedBy = "terraform"
      Stack     = "foundation"
    }
  }
}

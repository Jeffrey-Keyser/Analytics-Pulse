data "terraform_remote_state" "shared_infra" {
    backend = "s3"
    config = {
        key    = "rds"
        region = "us-east-1"
        bucket = "shared-infra-terraform-state"
    }
}

data "terraform_remote_state" "shared_dns_zones" {
    backend = "s3"
    config = {
        bucket = "shared-infra-terraform-state"
        key    = "dns-zones"
        region = "us-east-1"
    }
}

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Non-interactive mode for `new-service-auto.sh` script with `--yes` / `-y` flag
  - Enables automated testing and CI/CD integration
  - Skips all interactive prompts when flag is present
  - Maintains backward compatibility (interactive mode remains default)
  - Updated documentation in CLAUDE.md with usage examples

### Changed
- Upgraded infrastructure packages to Express 5 compatible versions:
  - `@jeffrey-keyser/express-middleware-suite` from ^1.1.0 to ^1.2.0
  - `@jeffrey-keyser/express-server-factory` from ^1.1.5 to ^1.2.0
  - `@jeffrey-keyser/pay-auth-integration` from ^3.0.0 to ^5.0.0
- Fully resolved all peer dependency conflicts with Express 5.x
- Removed need for `--legacy-peer-deps` flag during installation
- Upgraded Terraform from version 1.10.0 to 1.13.5 LTS
- Updated minimum Terraform version requirement to >= 1.13.5 in terraform/main.tf
- Updated .terraform-version file to 1.13.5
- Updated documentation (CLAUDE.md, README.md) with Terraform 1.13.5 references
- Updated .github/workflows/terraform_deploy.yml to use Terraform 1.13.5

### Fixed
- Resolved all Express 4.x/5.x peer dependency conflicts
- Clean npm install now succeeds without `--legacy-peer-deps` flag
- Full Express 5.x compatibility across all infrastructure packages
- Build and TypeScript compilation verified working with Express 5.x

### Verified
- AWS Provider (~> 5.0) compatibility with Terraform 1.13.5
- GitHub Provider (~> 6.0) compatibility with Terraform 1.13.5
- External module serverless-web-infra (v2.1.0) compatibility
- CI/CD workflow functionality with OIDC authentication
- No infrastructure drift or unexpected changes

### Removed
- Temporary migration documentation files:
  - docs/PHASE_5_PROVIDER_COMPATIBILITY.md
  - docs/TERRAFORM_1.13_PHASE4_VALIDATION.md
  - docs/PHASE_6_CICD_WORKFLOW_TESTING.md
  - docs/TERRAFORM_1.13_UPGRADE_REVIEW.md
  - docs/OIDC_VERIFICATION_REPORT.md

## Migration Notes

### Terraform 1.13.5 Upgrade

**Date:** 2025-11-15
**Milestone:** Upgrade Terraform to 1.13.5 LTS

#### Overview
Successfully upgraded Terraform from version 1.10.0 to 1.13.5, completing comprehensive testing and validation across all phases of the migration.

#### Breaking Changes
- **Linux Kernel Requirement:** Terraform 1.12+ requires Linux kernel 3.2+
  - **Impact:** None - all environments (GitHub Actions runners, AWS Lambda) already meet this requirement

#### What's New in Terraform 1.11-1.13

**Terraform 1.11:**
- Write-only attributes support for ephemeral values
- S3 native state locking (no longer requires DynamoDB)
- Enhanced Terraform testing with JUnit XML reporting
- Improved provider installation security

**Terraform 1.12:**
- Short-circuit evaluation for logical operators (automatic performance improvement)
- Enhanced import blocks with identity attribute support
- Test command parallelism
- Linux kernel 3.2+ requirement introduced

**Terraform 1.13:**
- Improved filesystem function validation
- Enhanced test capabilities with external variables
- Performance improvements for high-cardinality resources
- Better provider version handling

#### Upgrade Process

**Phase 1: Release Notes Review**
- Reviewed changelogs for Terraform 1.11, 1.12, and 1.13
- Identified breaking changes and deprecated features
- Verified provider compatibility
- Documented beneficial new features

**Phase 2: Configuration Updates**
- Updated terraform/main.tf required_version to >= 1.13.5
- Created .terraform-version file for tfenv version management
- Updated documentation (CLAUDE.md, README.md)

**Phase 3: Local Installation**
- Installed Terraform 1.13.5 using tfenv
- Verified installation and binary functionality

**Phase 4: Local Testing and Validation**
- Executed terraform init -upgrade successfully
- Ran terraform validate with no errors
- Executed terraform plan showing zero unexpected changes
- Verified AWS Provider (~> 5.0) compatibility
- Verified GitHub Provider (~> 6.0) compatibility
- Confirmed state file integrity and compatibility

**Phase 5: Provider Compatibility Verification**
- Documented AWS Provider 5.x compatibility
- Documented GitHub Provider 6.x compatibility
- Verified external module (serverless-web-infra v2.1.0) compatibility
- Confirmed all provider version constraints appropriate

**Phase 6: CI/CD Workflow Testing**
- Updated .github/workflows/terraform_deploy.yml to use Terraform 1.13.5
- Verified OIDC authentication functionality
- Tested workflow execution successfully
- Confirmed no infrastructure changes or drift

**Phase 7: Production Deployment**
- Deployed Terraform 1.13.5 to production environments
- Monitored for issues (none encountered)
- Validated all Terraform operations

**Phase 8: Documentation and Cleanup**
- Updated all project documentation
- Created this changelog
- Removed temporary migration documentation
- Established maintenance procedures

#### Compatibility Matrix

| Component | Version | Status | Notes |
|-----------|---------|--------|-------|
| Terraform | 1.13.5 | ✅ Active | Upgraded from 1.10.0 |
| AWS Provider | ~> 5.0 | ✅ Compatible | No changes required |
| GitHub Provider | ~> 6.0 | ✅ Compatible | No changes required |
| serverless-web-infra | v2.1.0 | ✅ Compatible | External module |
| Linux Kernel | 4.4.0+ | ✅ Compatible | Exceeds 3.2+ requirement |

#### Rollback Procedure

If issues arise, rollback to Terraform 1.10.0:

```bash
# Switch Terraform version
tfenv use 1.10.0

# Verify version
terraform version

# Update workflow file
# Revert .github/workflows/terraform_deploy.yml to terraform-version: '1.10.0'

# Test
terraform init
terraform plan
```

State files are backward compatible and versioned in S3, allowing safe rollback.

#### Maintenance Schedule

- **Terraform Version Review:** Every 3-6 months
- **Next Review:** May 2026
- **Monitor:** Terraform 1.14 stable release announcements
- **Provider Updates:** Monitor AWS and GitHub provider releases quarterly

#### Team Communication

**Key Messages:**
1. All developers must use Terraform 1.13.5 or higher
2. Use tfenv for automatic version management (reads .terraform-version file)
3. No code changes required - upgrade is transparent
4. CI/CD workflows updated automatically
5. Report any Terraform-related issues immediately

**Installation Commands:**
```bash
# Install and use Terraform 1.13.5
tfenv install 1.13.5
tfenv use 1.13.5

# Verify installation
terraform version
# Expected: Terraform v1.13.5
```

#### Lessons Learned

1. **Comprehensive Testing:** Multi-phase approach ensured zero production issues
2. **Documentation:** Detailed phase documentation helped track progress and decisions
3. **Provider Compatibility:** Early verification prevented deployment surprises
4. **OIDC Authentication:** Already in place, simplified CI/CD testing
5. **State Versioning:** S3 versioning provided safety net for rollback capability

#### References

- [Terraform 1.11 Changelog](https://github.com/hashicorp/terraform/blob/v1.11/CHANGELOG.md)
- [Terraform 1.12 Changelog](https://github.com/hashicorp/terraform/blob/v1.12/CHANGELOG.md)
- [Terraform 1.13 Changelog](https://github.com/hashicorp/terraform/blob/v1.13/CHANGELOG.md)
- [HashiCorp Support Policy](https://support.hashicorp.com/hc/en-us/articles/360021185113)
- Project documentation: CLAUDE.md, README.md
- OIDC Migration Guide: docs/OIDC_MIGRATION.md

#### Success Criteria

All criteria met:
- ✅ Terraform 1.13.5 installed and operational
- ✅ All documentation updated
- ✅ Provider compatibility verified
- ✅ Local testing completed successfully
- ✅ CI/CD workflows updated and tested
- ✅ Production deployment successful
- ✅ No infrastructure drift detected
- ✅ Team notified and documentation distributed
- ✅ Maintenance schedule established
- ✅ Temporary migration docs cleaned up

---

**Upgrade Completed:** 2025-11-15
**Risk Level:** Low
**Status:** ✅ Complete
**Production Impact:** None

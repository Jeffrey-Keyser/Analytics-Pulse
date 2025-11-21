# Using the Terraform .env File

To use terraform commands without entering the GitHub token each time:

1. Source the .env file before running terraform commands:
   ```bash
   source .env
   terraform plan
   terraform apply
   ```

2. Or combine in one line:
   ```bash
   source .env && terraform plan
   ```

3. To make it permanent for your current shell session:
   ```bash
   export $(cat .env | xargs)
   ```

Note: The .env file contains sensitive information and is excluded from git.
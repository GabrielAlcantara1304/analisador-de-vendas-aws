variable "region" {
  default = "us-east-1"
}

variable "bucket_name" {
  default = "gabriel-datalake-vendas"
}

variable "lambda_zip" {
  default = "lambda_function.zip"
}

variable "domain_name" {
  default = "loja-aws.com"
}

variable "ami_id" {
  description = "AMI para EC2 (ex: Ubuntu 22.04)"
  default = "ami-053b0d53c279acc90" # Ubuntu 22.04 LTS (us-east-1)
}

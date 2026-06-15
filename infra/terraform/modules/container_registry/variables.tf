variable "name_prefix" {
  description = "Prefix used when generating the registry name."
  type        = string
}

variable "environment" {
  description = "Deployment environment."
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group."
  type        = string
}

variable "location" {
  description = "Azure region."
  type        = string
}

variable "sku" {
  description = "ACR SKU."
  type        = string
  default     = "Basic"
}

variable "tags" {
  description = "Resource tags."
  type        = map(string)
  default     = {}
}

variable "name" {
  description = "Name of the virtual network."
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

variable "address_space" {
  description = "VNet address space."
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "container_apps_subnet_prefix" {
  description = "Subnet prefix for Container Apps."
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_endpoint_subnet_prefix" {
  description = "Subnet prefix for private endpoints."
  type        = string
  default     = "10.0.2.0/24"
}

variable "tags" {
  description = "Resource tags."
  type        = map(string)
  default     = {}
}

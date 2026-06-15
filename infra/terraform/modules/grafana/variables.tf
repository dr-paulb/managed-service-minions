variable "name" {
  description = "Name of the Managed Grafana instance."
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
  description = "Managed Grafana SKU."
  type        = string
  default     = "Essential"
}

variable "tags" {
  description = "Resource tags."
  type        = map(string)
  default     = {}
}

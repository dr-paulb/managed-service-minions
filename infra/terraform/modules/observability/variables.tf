variable "name" {
  description = "Name of the Log Analytics workspace."
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

variable "retention_days" {
  description = "Data retention in days."
  type        = number
  default     = 30
}

variable "tags" {
  description = "Resource tags."
  type        = map(string)
  default     = {}
}

resource "azurerm_container_app_environment" "main" {
  name                       = var.environment_name
  resource_group_name        = var.resource_group_name
  location                   = var.location
  infrastructure_subnet_id   = var.subnet_id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  tags = var.tags
}

resource "azurerm_container_app" "orchestrator" {
  name                         = var.orchestrator.name
  resource_group_name          = var.resource_group_name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [var.orchestrator.identity_id]
  }

  template {
    min_replicas = var.orchestrator.min_replicas
    max_replicas = var.orchestrator.max_replicas

    container {
      name   = "orchestrator"
      image  = var.orchestrator.image
      cpu    = 1.0
      memory = "2Gi"

      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.secrets
        content {
          name        = env.key
          secret_name = env.key
        }
      }
    }

    custom_scale_rule {
      name             = "service-bus-scale"
      custom_rule_type = "azure-servicebus"

      metadata = {
        namespaceName    = var.orchestrator.service_bus_rule.namespace_name
        topicName        = var.orchestrator.service_bus_rule.topic_name
        subscriptionName = var.orchestrator.service_bus_rule.subscription_name
        messageCount     = "3"
      }

      authentication {
        secret_name       = "SERVICE_BUS_CONNECTION_STRING"
        trigger_parameter = "connection"
      }
    }
  }

  dynamic "secret" {
    for_each = var.secrets
    content {
      name  = secret.key
      value = secret.value
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].container[0].image
    ]
  }
}

resource "azurerm_container_app" "slack_bot" {
  name                         = var.slack_bot.name
  resource_group_name          = var.resource_group_name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [var.slack_bot.identity_id]
  }

  template {
    min_replicas = 1
    max_replicas = 1

    container {
      name   = "slack-bot"
      image  = var.slack_bot.image
      cpu    = 0.5
      memory = "1Gi"

      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.secrets
        content {
          name        = env.key
          secret_name = env.key
        }
      }
    }
  }

  dynamic "secret" {
    for_each = var.secrets
    content {
      name  = secret.key
      value = secret.value
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].container[0].image
    ]
  }
}

resource "azurerm_container_app" "teams_bot" {
  name                         = var.teams_bot.name
  resource_group_name          = var.resource_group_name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [var.teams_bot.identity_id]
  }

  template {
    min_replicas = 1
    max_replicas = 1

    container {
      name   = "teams-bot"
      image  = var.teams_bot.image
      cpu    = 0.5
      memory = "1Gi"

      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.secrets
        content {
          name        = env.key
          secret_name = env.key
        }
      }
    }
  }

  dynamic "secret" {
    for_each = var.secrets
    content {
      name  = secret.key
      value = secret.value
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].container[0].image
    ]
  }
}

import type { CanvasNode, CanvasEdge, NodeShape } from "@/types/canvas"
import { NODE_COLORS, SHAPE_DEFAULT_SIZES } from "@/types/canvas"

export interface CanvasTemplate {
  id: string
  name: string
  description: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

/**
 * Helper to construct a CanvasNode for starter templates.
 */
function createNode(
  id: string,
  label: string,
  shape: NodeShape,
  colorKey: keyof typeof NODE_COLORS,
  x: number,
  y: number,
  customDimensions?: { width: number; height: number }
): CanvasNode {
  const colorPair = NODE_COLORS[colorKey] ?? NODE_COLORS.neutral
  const defaultSize = SHAPE_DEFAULT_SIZES[shape]
  const width = customDimensions?.width ?? defaultSize.width
  const height = customDimensions?.height ?? defaultSize.height

  return {
    id,
    type: "canvasNode",
    position: { x, y },
    data: {
      label,
      shape,
      color: colorPair.fill,
      textColor: colorPair.text,
    },
    style: {
      width,
      height,
    },
  }
}

/**
 * Helper to construct a CanvasEdge for starter templates.
 */
function createEdge(
  id: string,
  source: string,
  target: string,
  label: string = "",
  sourceHandle: "top" | "right" | "bottom" | "left" = "right",
  targetHandle: "top" | "right" | "bottom" | "left" = "left"
): CanvasEdge {
  return {
    id,
    type: "canvasEdge",
    source,
    target,
    sourceHandle,
    targetHandle,
    data: {
      label,
    },
  }
}

/**
 * Predefined starter templates library.
 */
export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: "microservices-architecture",
    name: "Microservices Architecture",
    description:
      "Modern cloud architecture featuring client applications, an API gateway, domain microservices, Redis caching, and persistent databases.",
    nodes: [
      createNode("client-app", "Client Apps", "pill", "blue", 40, 160),
      createNode("api-gateway", "API Gateway", "hexagon", "teal", 260, 150),
      createNode("auth-service", "Auth Service", "diamond", "purple", 480, 20),
      createNode("user-service", "User Service", "rectangle", "neutral", 480, 160),
      createNode("order-service", "Order Service", "rectangle", "orange", 480, 290),
      createNode("redis-cache", "Redis Cache", "cylinder", "red", 720, 90),
      createNode("postgres-db", "Postgres DB", "cylinder", "green", 720, 240),
    ],
    edges: [
      createEdge("e-client-gw", "client-app", "api-gateway", "HTTPS", "right", "left"),
      createEdge("e-gw-auth", "api-gateway", "auth-service", "Verify Token", "right", "left"),
      createEdge("e-gw-user", "api-gateway", "user-service", "/users", "right", "left"),
      createEdge("e-gw-order", "api-gateway", "order-service", "/orders", "right", "left"),
      createEdge("e-user-cache", "user-service", "redis-cache", "Cache Query", "right", "left"),
      createEdge("e-user-db", "user-service", "postgres-db", "Read / Write", "right", "left"),
      createEdge("e-order-db", "order-service", "postgres-db", "Transactions", "right", "left"),
    ],
  },
  {
    id: "cicd-pipeline",
    name: "CI/CD Pipeline",
    description:
      "Automated continuous integration and deployment workflow from git commits to automated testing, container packaging, and production rollout.",
    nodes: [
      createNode("git-push", "Git Push", "circle", "blue", 40, 160),
      createNode("build-lint", "Build & Lint", "rectangle", "neutral", 180, 160),
      createNode("unit-tests", "Unit Tests", "rectangle", "purple", 390, 160),
      createNode("quality-gate", "Quality Gate", "diamond", "orange", 600, 135),
      createNode("docker-build", "Docker Build", "pill", "teal", 810, 60),
      createNode("staging-deploy", "Staging Deploy", "rectangle", "green", 1020, 60),
      createNode("production-deploy", "Production", "hexagon", "pink", 1230, 50),
      createNode("notify-failure", "Notify Team", "rectangle", "red", 810, 250),
    ],
    edges: [
      createEdge("e-push-build", "git-push", "build-lint", "Trigger", "right", "left"),
      createEdge("e-build-test", "build-lint", "unit-tests", "Artifacts", "right", "left"),
      createEdge("e-test-gate", "unit-tests", "quality-gate", "Coverage", "right", "left"),
      createEdge("e-gate-docker", "quality-gate", "docker-build", "Passed", "right", "left"),
      createEdge("e-docker-staging", "docker-build", "staging-deploy", "Push Image", "right", "left"),
      createEdge("e-staging-prod", "staging-deploy", "production-deploy", "Promote", "right", "left"),
      createEdge("e-gate-notify", "quality-gate", "notify-failure", "Failed", "bottom", "left"),
    ],
  },
  {
    id: "event-driven-system",
    name: "Event-Driven System",
    description:
      "Decoupled asynchronous architecture using pub/sub event brokers, event-driven consumers, streaming analytics, and persistent cold storage.",
    nodes: [
      createNode("producer", "Event Producer", "rectangle", "blue", 40, 160),
      createNode("event-broker", "Kafka Event Bus", "hexagon", "orange", 280, 150),
      createNode("analytics-worker", "Analytics Worker", "rectangle", "purple", 510, 30),
      createNode("notification-worker", "Notification Worker", "rectangle", "teal", 510, 160),
      createNode("audit-worker", "Audit Logger", "rectangle", "neutral", 510, 290),
      createNode("data-warehouse", "Data Warehouse", "cylinder", "green", 750, 30),
      createNode("push-gateway", "Push Gateway", "pill", "pink", 750, 160),
      createNode("cold-storage", "S3 Cold Storage", "cylinder", "red", 750, 290),
    ],
    edges: [
      createEdge("e-prod-broker", "producer", "event-broker", "Publish Event", "right", "left"),
      createEdge("e-broker-analytics", "event-broker", "analytics-worker", "analytics.topic", "right", "left"),
      createEdge("e-broker-notification", "event-broker", "notification-worker", "alerts.topic", "right", "left"),
      createEdge("e-broker-audit", "event-broker", "audit-worker", "audit.topic", "right", "left"),
      createEdge("e-analytics-wh", "analytics-worker", "data-warehouse", "Batch Insert", "right", "left"),
      createEdge("e-notify-gw", "notification-worker", "push-gateway", "Dispatch", "right", "left"),
      createEdge("e-audit-storage", "audit-worker", "cold-storage", "Archive Log", "right", "left"),
    ],
  },
]

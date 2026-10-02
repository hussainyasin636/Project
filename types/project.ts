export interface Project {
  id: string
  name: string
  slug: string
  isOwner: boolean
  updatedAt: string
}

export const INITIAL_MOCK_PROJECTS: Project[] = [
  {
    id: "proj-1",
    name: "E-Commerce Microservices",
    slug: "e-commerce-microservices",
    isOwner: true,
    updatedAt: "2 hours ago",
  },
  {
    id: "proj-2",
    name: "Payment Gateway",
    slug: "payment-gateway",
    isOwner: true,
    updatedAt: "Yesterday",
  },
  {
    id: "proj-3",
    name: "Real-time Analytics",
    slug: "real-time-analytics",
    isOwner: false,
    updatedAt: "3 days ago",
  },
]

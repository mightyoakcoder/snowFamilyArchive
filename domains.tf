# Your existing Cloud Run service
resource "google_cloud_run_v2_service" "snowfamilyarchive" {
  name     = "snowfamilyarchive"
  location = "us-central1"
  
  template {
    containers {
      image = "your-image"  # gcr.io/becky-weeks-projects/snowfamilyarchive
    }
  }
}

# All domain mappings in one resource
resource "google_cloud_run_domain_mapping" "domains" {
  for_each = toset([
    "snowfamilyarchive.com",
    "www.snowfamilyarchive.com", 
    "test.snowfamilyarchive.com"
  ])

  location = "us-central1"
  name     = each.value  # Domain name itself
  
  spec {
    route_name = google_cloud_run_v2_service.snowfamilyarchive.name
  }
  
  depends_on = [google_cloud_run_v2_service.snowfamilyarchive]
}

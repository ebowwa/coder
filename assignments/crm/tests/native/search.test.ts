/**
 * Native Search Module Tests
 *
 * Tests for the Rust-based search functionality.
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";

// These tests require the native module to be built first
// They test the fallback behavior when native is not available

describe("Native Search Module", () => {
  describe("Fallback Implementation", () => {
    test("CrmSearchIndex basic operations work", async () => {
      // Import the fallback loader
      const { CrmSearchIndex } = await import("../../native/index.js");

      const index = new CrmSearchIndex("/tmp/test-crm-index");

      // Add some documents
      index.addDocument({
        id: "contact-1",
        entityType: "contact",
        name: "John Doe",
        email: "john@example.com",
        company: "Acme Corp",
        tags: ["vip", "customer"],
        notes: "Important client",
      });

      index.addDocument({
        id: "deal-1",
        entityType: "deal",
        title: "Big Deal",
        value: 50000,
        stage: "proposal",
        tags: ["enterprise"],
      });

      // Commit changes
      index.commit();

      // Search for contacts
      const results = index.search({
        query: "John",
        entityTypes: ["contact"],
        limit: 10,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("contact-1");

      // Get stats
      const stats = index.getStats();
      expect(stats.contactCount).toBe(1);
      expect(stats.dealCount).toBe(1);
    });

    test("CrmSearchIndex search with filters", async () => {
      const { CrmSearchIndex } = await import("../../native/index.js");

      const index = new CrmSearchIndex("/tmp/test-crm-filter");

      index.addDocument({
        id: "contact-2",
        entityType: "contact",
        name: "Jane Smith",
        email: "jane@techcorp.com",
        tags: ["tech", "prospect"],
      });

      index.addDocument({
        id: "contact-3",
        entityType: "contact",
        name: "Bob Johnson",
        email: "bob@acmecorp.com",
        tags: ["vip", "customer"],
      });

      index.commit();

      // Search with tag filter
      const results = index.search({
        tags: ["vip"],
        entityTypes: ["contact"],
        limit: 10,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("contact-3"); // contact-3 has "vip" tag in this test
    });

    test("CrmIndexManager CRUD operations", async () => {
      const { CrmIndexManager } = await import("../../native/index.js");

      const manager = new CrmIndexManager();

      // Index a contact
      const now = Date.now();
      manager.indexContact({
        id: "c1",
        name: "Test Contact",
        email: "test@test.com",
        tags: ["test"],
        createdAt: now,
        updatedAt: now,
      });

      // Retrieve the contact
      const contact = manager.getContact("c1");
      expect(contact).not.toBeNull();
      expect(contact?.name).toBe("Test Contact");

      // Get counts
      const counts = manager.getCounts();
      expect(counts.contacts).toBe(1);

      // Remove contact
      manager.removeContact("c1");
      expect(manager.getContact("c1")).toBeNull();
    });

    test("CrmIndexManager deal operations", async () => {
      const { CrmIndexManager } = await import("../../native/index.js");

      const manager = new CrmIndexManager();

      const dealNow = Date.now();
      manager.indexDeal({
        id: "d1",
        title: "Test Deal",
        contactId: "c1",
        value: 10000,
        stage: "prospecting",
        tags: ["test"],
        createdAt: dealNow,
        updatedAt: dealNow,
      });

      const deal = manager.getDeal("d1");
      expect(deal).not.toBeNull();
      expect(deal?.value).toBe(10000);
    });

    test("CrmIndexManager company operations", async () => {
      const { CrmIndexManager } = await import("../../native/index.js");

      const manager = new CrmIndexManager();

      const companyNow = Date.now();
      manager.indexCompany({
        id: "co1",
        name: "Test Company",
        industry: "technology",
        tags: ["test"],
        createdAt: companyNow,
        updatedAt: companyNow,
      });

      const company = manager.getCompany("co1");
      expect(company).not.toBeNull();
      expect(company?.name).toBe("Test Company");
    });
  });

  describe("Media Metadata", () => {
    test("isValidMediaType validates common types", async () => {
      const { isValidMediaType } = await import("../../native/index.js");

      expect(isValidMediaType("image.jpg")).toBe(true);
      expect(isValidMediaType("video.mp4")).toBe(true);
      expect(isValidMediaType("audio.mp3")).toBe(true);
      expect(isValidMediaType("document.pdf")).toBe(false);
      expect(isValidMediaType("data.json")).toBe(false);
    });

    test("extractMediaMetadata returns metadata for files", async () => {
      const { extractMediaMetadata } = await import("../../native/index.js");

      // Create a test image file
      const testImagePath = "/tmp/test-image.jpg";
      const testImageContent = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, // JPEG magic bytes
        0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);

      await Bun.write(testImagePath, testImageContent);

      const metadata = extractMediaMetadata(testImagePath);

      expect(metadata.mimeType).toBe("image/jpeg");
      expect(metadata.size).toBe(testImageContent.length);

      // Cleanup
      await Bun.file(testImagePath).delete();
    });
  });

  describe("Utility Functions", () => {
    test("isNativeAvailable returns boolean", async () => {
      const { isNativeAvailable } = await import("../../native/index.js");

      // Should return true if native is built
      const available = isNativeAvailable();
      expect(typeof available).toBe("boolean");
    });

    test("getNativeVersion returns string", async () => {
      const { getNativeVersion } = await import("../../native/index.js");

      const version = getNativeVersion();
      expect(typeof version).toBe("string");
      expect(version.length).toBeGreaterThan(0);
    });
  });
});

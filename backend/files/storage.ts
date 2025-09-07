import { Bucket } from "encore.dev/storage/objects";

export const filesBucket = new Bucket("premium-files", {
  public: false,
  versioned: false,
});

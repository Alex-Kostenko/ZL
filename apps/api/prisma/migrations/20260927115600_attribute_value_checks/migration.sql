-- Not expressible in Prisma schema: each row stores exactly one typed value (§8),
-- and a range upper bound only together with its lower bound.
ALTER TABLE "product_attribute_values"
  ADD CONSTRAINT "product_attribute_values_one_value_chk"
    CHECK (num_nonnulls("value_id", "value_number", "value_boolean", "value_text") = 1),
  ADD CONSTRAINT "product_attribute_values_range_chk"
    CHECK ("value_number_to" IS NULL OR ("value_number" IS NOT NULL AND "value_number_to" >= "value_number"));

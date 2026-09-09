  WITH attempt AS (
    INSERT INTO rate_limit_buckets AS bucket (subject, theoretical_arrival_at, updated_at)
    VALUES (subject_key, requested_at + emission_interval, requested_at)
    ON CONFLICT (subject) DO UPDATE
      SET theoretical_arrival_at =
            greatest(bucket.theoretical_arrival_at, requested_at) + emission_interval,
          updated_at = requested_at
      WHERE greatest(bucket.theoretical_arrival_at, requested_at) + emission_interval
              - delay_tolerance <= requested_at
    RETURNING bucket.theoretical_arrival_at
  )

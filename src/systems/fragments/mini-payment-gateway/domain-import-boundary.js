  // The domain is pure. It knows nothing about how anything is stored or transported.
  {
    files: ['apps/api/src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [...INFRASTRUCTURE_ONLY_PACKAGES, '**/infrastructure/**', '**/interface/**'],
              message:
                'The domain layer must not depend on infrastructure. Move this behind a port in application/ports.',
            },
          ],
        },
      ],
    },
  },

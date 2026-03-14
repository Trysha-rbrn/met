DO $$
BEGIN
  CREATE TYPE "DataTransferAction" AS ENUM ('IMPORT', 'EXPORT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "DataTransferFormat" AS ENUM ('EXCEL', 'PDF');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "DataTransferLog"
  ALTER COLUMN "action" TYPE "DataTransferAction"
  USING (
    CASE
      WHEN UPPER("action") = 'IMPORT' THEN 'IMPORT'::"DataTransferAction"
      WHEN UPPER("action") = 'EXPORT' THEN 'EXPORT'::"DataTransferAction"
      ELSE 'EXPORT'::"DataTransferAction"
    END
  );

ALTER TABLE "DataTransferLog"
  ALTER COLUMN "format" TYPE "DataTransferFormat"
  USING (
    CASE
      WHEN UPPER("format") = 'EXCEL' THEN 'EXCEL'::"DataTransferFormat"
      WHEN UPPER("format") = 'PDF' THEN 'PDF'::"DataTransferFormat"
      ELSE 'EXCEL'::"DataTransferFormat"
    END
  );

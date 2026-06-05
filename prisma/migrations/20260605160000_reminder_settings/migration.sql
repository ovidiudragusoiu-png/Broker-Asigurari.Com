CREATE TABLE IF NOT EXISTS "ReminderSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "reminderDayOffsets" TEXT NOT NULL DEFAULT '30,7,1',
    "remindersEnabled" BOOLEAN NOT NULL DEFAULT 1,
    "emailRemindersEnabled" BOOLEAN NOT NULL DEFAULT 1,
    "smsRemindersEnabled" BOOLEAN NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedByEmail" TEXT
);

INSERT OR IGNORE INTO "ReminderSettings" ("id", "reminderDayOffsets")
VALUES ('default', '30,7,1');

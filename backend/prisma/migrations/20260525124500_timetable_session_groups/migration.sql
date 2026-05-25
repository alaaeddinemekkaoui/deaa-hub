CREATE TABLE "TimetableSessionGroup" (
    "sessionId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,

    CONSTRAINT "TimetableSessionGroup_pkey" PRIMARY KEY ("sessionId","groupId")
);

CREATE INDEX "TimetableSessionGroup_groupId_idx" ON "TimetableSessionGroup"("groupId");

ALTER TABLE "TimetableSessionGroup" ADD CONSTRAINT "TimetableSessionGroup_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TimetableSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TimetableSessionGroup" ADD CONSTRAINT "TimetableSessionGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

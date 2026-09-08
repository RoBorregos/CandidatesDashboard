-- CreateEnum
CREATE TYPE "InterviewArea" AS ENUM ('MECHANICS', 'ELECTRONICS', 'PROGRAMMING');

-- CreateEnum
CREATE TYPE "CompetitionTrack" AS ENUM ('BEGINNER', 'ADVANCED');

-- CreateEnum
CREATE TYPE "Origin" AS ENUM ('LOCAL', 'FOREIGN');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CONTESTANT', 'JUDGE', 'ADMIN', 'UNASSIGNED');

-- CreateEnum
CREATE TYPE "Pattern" AS ENUM ('A3', 'A4', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3', 'D4', 'E1', 'E2', 'E3', 'E4', 'FINISH', 'BONUS');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "refresh_token_expires_in" INTEGER,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL,
    "edition" INTEGER NOT NULL DEFAULT 2026,
    "track" "CompetitionTrack" NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "challenge" TEXT,
    "hasTeam" BOOLEAN NOT NULL,
    "teamName" TEXT,
    "wantsExtraMember" BOOLEAN,
    "knowsExtraMember" BOOLEAN,
    "origin" "Origin",
    "funFacts" TEXT,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationMember" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "career" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "interviewArea" "InterviewArea",
    "edition" INTEGER NOT NULL DEFAULT 2026,
    "userId" TEXT,

    CONSTRAINT "RegistrationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorAssignment" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "userId" TEXT,
    "registrationMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorPair" (
    "id" TEXT NOT NULL,
    "edition" INTEGER NOT NULL DEFAULT 2026,
    "mentorAId" TEXT NOT NULL,
    "mentorBId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorPair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMentorPair" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "mentorPairId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMentorPair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interviewer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "area" "InterviewArea" NOT NULL,

    CONSTRAINT "Interviewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "interviewTime" TIMESTAMP(3),
    "interviewArea" "InterviewArea",
    "interviewerId" TEXT,
    "role" "Role" NOT NULL DEFAULT 'UNASSIGNED',
    "teamId" TEXT,
    "isStaff" BOOLEAN NOT NULL DEFAULT false,
    "isMentor" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "EmailTeam" (
    "email" TEXT NOT NULL,
    "team" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Judge" (
    "email" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Admin" (
    "email" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "driveLink" TEXT,
    "binnacleLink" TEXT,
    "robotImageLink" TEXT,
    "githubLink" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamUpload" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "customId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "fileType" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mentorPairId" TEXT,

    CONSTRAINT "TeamUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT false,
    "teamId" TEXT,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "roundId" TEXT NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeA" (
    "id" TEXT NOT NULL,
    "flagsAccomplished" INTEGER NOT NULL,
    "finishedTrack" BOOLEAN NOT NULL,
    "obtainedBonus" BOOLEAN NOT NULL,
    "judgeID" TEXT NOT NULL,
    "lackOfProgress" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "roundTimeSeconds" INTEGER NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roundId" TEXT NOT NULL,

    CONSTRAINT "ChallengeA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeB" (
    "id" TEXT NOT NULL,
    "trackPoints" INTEGER NOT NULL,
    "patternsPassed" "Pattern"[],
    "judgeID" TEXT NOT NULL,
    "lackOfProgress" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "roundId" TEXT NOT NULL,
    "roundTimeSeconds" INTEGER NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeB_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeC" (
    "id" TEXT NOT NULL,
    "judgeID" TEXT NOT NULL,
    "lackOfProgress" INTEGER NOT NULL,
    "detectedColors" INTEGER NOT NULL,
    "passedObstacles" INTEGER NOT NULL,
    "obtainedBonus" BOOLEAN NOT NULL,
    "finishedTrack" BOOLEAN NOT NULL,
    "passedRamp" BOOLEAN NOT NULL,
    "reverseRamp" BOOLEAN NOT NULL,
    "points" INTEGER NOT NULL,
    "roundId" TEXT NOT NULL,
    "roundTimeSeconds" INTEGER NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "crossedRampWithoutLOP" BOOLEAN NOT NULL,
    "crossedRampWithoutTouching" BOOLEAN NOT NULL,

    CONSTRAINT "ChallengeC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config" (
    "id" SERIAL NOT NULL,
    "freeze" BOOLEAN NOT NULL DEFAULT true,
    "competitionStarted" BOOLEAN NOT NULL DEFAULT false,
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "roundsRevealed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unavailability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Unavailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Registration_edition_status_idx" ON "Registration"("edition", "status");

-- CreateIndex
CREATE INDEX "RegistrationMember_career_idx" ON "RegistrationMember"("career");

-- CreateIndex
CREATE INDEX "RegistrationMember_semester_idx" ON "RegistrationMember"("semester");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationMember_registrationId_order_key" ON "RegistrationMember"("registrationId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationMember_email_edition_key" ON "RegistrationMember"("email", "edition");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationMember_userId_edition_key" ON "RegistrationMember"("userId", "edition");

-- CreateIndex
CREATE UNIQUE INDEX "MentorAssignment_mentorId_userId_key" ON "MentorAssignment"("mentorId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "MentorAssignment_mentorId_registrationMemberId_key" ON "MentorAssignment"("mentorId", "registrationMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "MentorPair_mentorAId_edition_key" ON "MentorPair"("mentorAId", "edition");

-- CreateIndex
CREATE UNIQUE INDEX "MentorPair_mentorBId_edition_key" ON "MentorPair"("mentorBId", "edition");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMentorPair_teamId_key" ON "TeamMentorPair"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Interviewer_email_key" ON "Interviewer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTeam_email_key" ON "EmailTeam"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Judge_email_key" ON "Judge"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TeamUpload_fileKey_key" ON "TeamUpload"("fileKey");

-- CreateIndex
CREATE UNIQUE INDEX "TeamUpload_customId_key" ON "TeamUpload"("customId");

-- CreateIndex
CREATE INDEX "TeamUpload_teamId_week_userId_idx" ON "TeamUpload"("teamId", "week", "userId");

-- CreateIndex
CREATE INDEX "Unavailability_userId_startMin_idx" ON "Unavailability"("userId", "startMin");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationMember" ADD CONSTRAINT "RegistrationMember_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationMember" ADD CONSTRAINT "RegistrationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorAssignment" ADD CONSTRAINT "MentorAssignment_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorAssignment" ADD CONSTRAINT "MentorAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorAssignment" ADD CONSTRAINT "MentorAssignment_registrationMemberId_fkey" FOREIGN KEY ("registrationMemberId") REFERENCES "RegistrationMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorPair" ADD CONSTRAINT "MentorPair_mentorAId_fkey" FOREIGN KEY ("mentorAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorPair" ADD CONSTRAINT "MentorPair_mentorBId_fkey" FOREIGN KEY ("mentorBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMentorPair" ADD CONSTRAINT "TeamMentorPair_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMentorPair" ADD CONSTRAINT "TeamMentorPair_mentorPairId_fkey" FOREIGN KEY ("mentorPairId") REFERENCES "MentorPair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "Interviewer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamUpload" ADD CONSTRAINT "TeamUpload_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamUpload" ADD CONSTRAINT "TeamUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamUpload" ADD CONSTRAINT "TeamUpload_mentorPairId_fkey" FOREIGN KEY ("mentorPairId") REFERENCES "TeamMentorPair"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeA" ADD CONSTRAINT "ChallengeA_judgeID_fkey" FOREIGN KEY ("judgeID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeA" ADD CONSTRAINT "ChallengeA_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeB" ADD CONSTRAINT "ChallengeB_judgeID_fkey" FOREIGN KEY ("judgeID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeB" ADD CONSTRAINT "ChallengeB_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeC" ADD CONSTRAINT "ChallengeC_judgeID_fkey" FOREIGN KEY ("judgeID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeC" ADD CONSTRAINT "ChallengeC_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unavailability" ADD CONSTRAINT "Unavailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


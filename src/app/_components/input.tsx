"use client";
import { useState } from "react";
import { api } from "rbrgs/trpc/react";
import { toast } from "sonner";

interface InputProps {
  teamId: string;
  prevLink?: string;
  prevGithub?: string;
}

const Input: React.FC<InputProps> = ({
  teamId,
  prevLink = "",
  prevGithub = "",
}) => {
  const [driveLink, setDriveLink] = useState(prevLink);
  const [githubLink, setGithubLink] = useState(prevGithub);

  // Separate mutations (React Query v5 => .isPending)
  const saveDriveLink = api.team.saveDriveLink.useMutation({
    onSuccess: () => toast("Drive link saved!"),
    onError: (e) => toast(`Drive link error: ${e.message}`),
  });

  const saveGithubLink = api.team.saveGithubLink.useMutation({
    onSuccess: () => toast("GitHub link saved!"),
    onError: (e) => toast(`GitHub link error: ${e.message}`),
  });

  const onSaveDrive = () => {
    saveDriveLink.mutate({ teamId, link: driveLink });
  };

  const onSaveGithub = () => {
    saveGithubLink.mutate({ teamId, link: githubLink });
  };

  return (
    <div className="mx-auto mt-10 max-w-xl px-20">
      <div className="flex flex-col gap-6">
        <div>
          <label className="text-md mb-1 block font-semibold">
            Google Drive Link
          </label>
          <p className="mb-2 text-sm text-gray-300">
            Got more things to share with us (cads, pcbs, pictures, etc.)? Share
            a drive with us and make sure to give us access.
          </p>
          <div className="flex gap-3">
            <input
              type="url"
              value={driveLink}
              onChange={(e) => setDriveLink(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="flex-1 rounded-md border border-gray-300 p-2 text-gray-900 focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={onSaveDrive}
              disabled={saveDriveLink.isPending}
              aria-busy={saveDriveLink.isPending}
              className={`rounded-md bg-blue-700 px-4 py-2 text-white transition ${saveDriveLink.isPending ? "cursor-not-allowed opacity-50" : "hover:bg-blue-800"}`}
            >
              {saveDriveLink.isPending ? "Saving..." : "Save Drive"}
            </button>
          </div>
          {saveDriveLink.error && (
            <p className="mt-1 text-sm text-red-600">
              {saveDriveLink.error.message}
            </p>
          )}
        </div>

        <div>
          <label className="text-md mb-1 block font-semibold">
            GitHub Repository Link
          </label>
          <p className="mb-2 text-sm text-gray-300">
            Make sure to set its visibulity to public.
          </p>
          <div className="flex gap-3">
            <input
              type="url"
              value={githubLink}
              onChange={(e) => setGithubLink(e.target.value)}
              placeholder="https://github.com/org/repo"
              className="flex-1 rounded-md border border-gray-300 p-2 text-gray-900 focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={onSaveGithub}
              disabled={saveGithubLink.isPending}
              aria-busy={saveGithubLink.isPending}
              className={`rounded-md bg-blue-700 px-4 py-2 text-white transition ${saveGithubLink.isPending ? "cursor-not-allowed opacity-50" : "hover:bg-blue-800"}`}
            >
              {saveGithubLink.isPending ? "Saving..." : "Save GitHub"}
            </button>
          </div>
          {saveGithubLink.error && (
            <p className="mt-1 text-sm text-red-600">
              {saveGithubLink.error.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Input;

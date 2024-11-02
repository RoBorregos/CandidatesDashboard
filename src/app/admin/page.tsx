"use client";

import Header from "rbrgs/app/_components/header";

import { api } from "~/trpc/react";
import { toast } from "sonner";

export default function AdminPage() {
  const createEvaluation = api.admin.uploadTeamData.useMutation({
    onSuccess() {
      toast("Data uploaded.");
    },
    onError(error) {
      toast("Error. Check console");
      console.error(error);
    },
  });
  return (
    <main className="mt-[4rem] h-96 bg-black text-sm text-white md:text-base">
      <div className="md:pb-20">
        <Header title="Admin" subtitle="" />
      </div>
      <div className="p-2">
        <button
          onClick={() => {
            createEvaluation.mutate();
          }}
          className="mt-9 rounded-lg bg-roboblue p-2"
        >
          Upload team data
        </button>
      </div>
    </main>
  );
}

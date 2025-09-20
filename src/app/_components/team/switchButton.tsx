"use client";

interface sbuttonProps {
  variant: string;
  onClick: () => void;
}

const SwitchButton: React.FC<sbuttonProps> = ({ variant, onClick }) => {
  return (
    <div className="mt-5 flex w-full flex-col justify-center gap-3 pb-20">
      <div className="mx-auto flex rounded-md bg-neutral-800 p-1 shadow-md">
        <ButtonX
          label="Schedule"
          selected={variant == "INFO"}
          onClick={onClick}
        />
        <ButtonX
          label="Results"
          selected={variant == "RESULTS"}
          onClick={onClick}
        />
      </div>
    </div>
  );
};

interface buttonProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

const ButtonX: React.FC<buttonProps> = ({ label, selected, onClick }) => {
  return (
    <button
      className={`flex items-center justify-center rounded-md p-2 ${selected ? "bg-blue-600 text-white" : "text-gray-400"}`}
      onClick={onClick}
    >
      <span>{label}</span>
    </button>
  );
};

export default SwitchButton;

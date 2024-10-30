import Image from "next/image";

interface TimelineImgProps {
  numberImage: number;
  col: number;
  row: number;
}

export default function TimelineImg({
  numberImage,
  row,
  col,
}: TimelineImgProps) {
  return (
    <div className={`relative col-start-${col} row-start-${row}`}>
      <Image
        src={`/images/tm${numberImage}.jpg`}
        alt={`Background decoration ${numberImage}`}
        layout="fill"
        objectFit="cover"
        className="rounded-xl"
      />
    </div>
  );
}

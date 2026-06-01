export default function Spinner({ size = 14, color = "#00d4aa" }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%",
      border: `2px solid ${color}`, borderTopColor: "transparent",
      display: "inline-block", animation: "spin .8s linear infinite",
    }} />
  );
}

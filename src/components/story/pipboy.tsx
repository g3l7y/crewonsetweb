import "./pipboy.css";

export default function Pipboy() {
  return (
    <div className="pipboy-wrapper">
      <div className="pipboy-chassis">
        <div className="screw tl" />
        <div className="screw tr" />
        <div className="screw bl" />
        <div className="screw br" />

        <div className="crt-screen">
          <div className="video-screen">
            <iframe
              className="pipboy-video"
              src="https://www.youtube-nocookie.com/embed/1Ea8Rj2wQ2w"
              title="The Story of Crew On Set!"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

import { SiteHeader } from "@/components/layout/SiteHeader";

export default function MainLoading() {
  return (
    <div className="page">
      <SiteHeader signedIn={false} />
      <div className="body">
        <div className="pad">
          <div className="skr">
            <i className="sk d" />
            <i className="sk p" />
          </div>
          <div className="skr">
            <i className="sk d" />
            <i className="sk p" />
          </div>
          <div className="skr">
            <i className="sk d" />
            <i className="sk p" />
          </div>
          <div className="skr">
            <i className="sk d" />
            <i className="sk p" />
          </div>
          <div className="skr">
            <i className="sk d" />
            <i className="sk p" />
          </div>
        </div>
      </div>
    </div>
  );
}

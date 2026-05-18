import Icon from "./Icon.jsx";

function PageHeader({ action, description, eyebrow, icon, title }) {
  return (
    <div className="page-header">
      <div className="page-header-main">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <div className="page-title-row">
          {icon ? (
            <span className="page-title-icon" aria-hidden="true">
              <Icon name={icon} size={18} />
            </span>
          ) : null}
          <h2>{title}</h2>
        </div>
        {description ? <p className="muted">{description}</p> : null}
      </div>
      {action ? <div className="page-header-action">{action}</div> : null}
    </div>
  );
}

export default PageHeader;

import Icon from "./Icon.jsx";

function Button({ children, className = "", icon, iconPosition = "start", tone = "primary", ...props }) {
  return (
    <button className={`button ${tone} ${className}`.trim()} type="button" {...props}>
      {icon && iconPosition === "start" ? <Icon className="button-icon" name={icon} size={16} /> : null}
      {children}
      {icon && iconPosition === "end" ? <Icon className="button-icon" name={icon} size={16} /> : null}
    </button>
  );
}

export default Button;

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client.js";

function QrRedirectPage() {
  const navigate = useNavigate();
  const { productCode } = useParams();
  const [error, setError] = useState("");

  useEffect(() => {
    async function openProduct() {
      try {
        const data = await apiRequest(`/api/products/code/${encodeURIComponent(productCode)}`);
        navigate(`/products/${data.product.id}`, { replace: true });
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    openProduct();
  }, [navigate, productCode]);

  return (
    <main className="center-shell">
      <section className="panel">
        <p className="eyebrow">QR Lookup</p>
        <h1 className="compact-heading">Opening product</h1>
        {error ? <p className="error-message">{error}</p> : null}
      </section>
    </main>
  );
}

export default QrRedirectPage;

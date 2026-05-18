import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api/client.js";

function QrLabelPage() {
  const { productCode } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProduct() {
      try {
        const data = await apiRequest(`/api/products/code/${encodeURIComponent(productCode)}`);
        setProduct(data.product);
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    loadProduct();
  }, [productCode]);

  if (error) {
    return (
      <main className="center-shell">
        <section className="panel">
          <p className="error-message">{error}</p>
        </section>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="center-shell">
        <section className="panel">
          <p>Loading QR label...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="label-page">
      <section className="qr-label">
        <div className="qr-label-copy">
          <p className="eyebrow">MetalMint</p>
          <h1>{product.product_code}</h1>
          <dl>
            <div>
              <dt>Type</dt>
              <dd>
                {product.product_type_code} - {product.product_type_name}
              </dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>{product.size_label || `${product.width} x ${product.height}`}</dd>
            </div>
            <div>
              <dt>Manufactured</dt>
              <dd>{product.manufacturing_date?.slice(0, 10)}</dd>
            </div>
          </dl>
        </div>
        <QRCodeCanvas value={product.qr_url} size={180} level="M" includeMargin />
      </section>
      <div className="label-actions">
        <button className="button primary" onClick={() => window.print()} type="button">
          Print Label
        </button>
        <Link className="button secondary" to={`/products/${product.id}`}>
          Back to Product
        </Link>
      </div>
    </main>
  );
}

export default QrLabelPage;

                <h2 style={{ fontSize: 22 }}>분석 결과</h2>
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.8,
                    background: "#fafafa",
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    padding: 20,
                  }}
                >
                  {result}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function StepTitle({ number, title }: { number: string; title: string }) {
  return (
    <h2 style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 0 }}>
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "#111827",
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
        }}
      >
        {number}
      </span>
      {title}
    </h2>
  );
}

function InfoBox({ title, value }: { title: string; value: string }) {
  return (
    <div
      style={{
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 14,
        textAlign: "center",
      }}
    >
      <div style={{ color: "#6b7280", fontSize: 12 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{value}</div>
    </div>
  );
}

const pillarGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 12,
};

const elementGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: 12,
};

const cardStyle = {
  background: "#fff",
  borderRadius: 18,
  padding: 24,
  boxShadow: "0 5px 20px rgba(0,0,0,0.05)",
  marginBottom: 20,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
  marginBottom: 20,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px 13px",
  marginTop: 7,
  border: "1px solid #d1d5db",
  borderRadius: 10,
  fontSize: 15,
  background: "#fff",
};

const primaryButton = {
  border: 0,
  borderRadius: 10,
  background: "#111827",
  color: "#fff",
  padding: "13px 18px",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButton = {
  border: "1px solid #d1d5db",
  borderRadius: 10,
  background: "#fff",
  color: "#111827",
  padding: "13px 18px",
  fontWeight: 800,
  cursor: "pointer",
};

const productGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12,
};

const productButton = {
  textAlign: "left" as const,
  background: "#fff",
  borderRadius: 14,
  padding: 18,
  cursor: "pointer",
};

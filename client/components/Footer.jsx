const STYLES = `


  :root {
    --accent:   #7b8cff;
  }

.footer {
    padding: 20px;
    text-align: center;
    font-size: 14px;
    color: var(--accent);
}
`;

export default function Footer() {
    return (
        <>
            <style>{STYLES}</style>
            <footer className="footer">
                <small>© {getCurrentYear()} Snow Family Archive. All rights reserved.</small>
            </footer>
        </>
    );
}

function getCurrentYear() {
    return new Date().getFullYear();
}
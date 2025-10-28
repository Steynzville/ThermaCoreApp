import logging
import os
import subprocess
import sys
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

try:
    from OpenSSL import crypto
except ImportError:
    logger.info("Installing pyOpenSSL...")
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "pyopenssl"],
        check=True,
    )
    from OpenSSL import crypto


def generate_self_signed_cert(cert_file, key_file, common_name="thermacore.local"):
    """Generate self-signed certificate for development/production"""
    try:
        # Create key pair
        k = crypto.PKey()
        k.generate_key(crypto.TYPE_RSA, 2048)

        # Create certificate
        cert = crypto.X509()
        cert.get_subject().C = "US"
        cert.get_subject().ST = "State"
        cert.get_subject().L = "City"
        cert.get_subject().O = "ThermaCore"
        cert.get_subject().OU = "IoT Division"
        cert.get_subject().CN = common_name
        cert.set_serial_number(1000)
        cert.gmtime_adj_notBefore(0)
        cert.gmtime_adj_notAfter(365 * 24 * 60 * 60)  # 1 year
        cert.set_issuer(cert.get_subject())
        cert.set_pubkey(k)
        cert.sign(k, "sha256")

        # Ensure directory exists
        cert_path = Path(cert_file)
        key_path = Path(key_file)
        cert_path.parent.mkdir(parents=True, exist_ok=True)
        key_path.parent.mkdir(parents=True, exist_ok=True)

        # Save certificate
        with cert_path.open("wb") as f:
            f.write(crypto.dump_certificate(crypto.FILETYPE_PEM, cert))
        logger.info("✓ Generated certificate: %s", cert_file)

        # Save private key
        with key_path.open("wb") as f:
            f.write(crypto.dump_privatekey(crypto.FILETYPE_PEM, k))
        logger.info("✓ Generated private key: %s", key_file)

        return True

    except Exception as e:
        logger.error("✗ Failed to generate certificates: %s", e)
        return False


def ensure_certificates():
    """Ensure all required certificate files exist"""
    logger.info("🔐 Generating MQTT and OPC-UA certificates...")

    cert_dir = "/tmp"
    certificates_to_generate = [
        # MQTT certificates
        (f"{cert_dir}/ca.crt", f"{cert_dir}/ca.key"),
        (f"{cert_dir}/client.crt", f"{cert_dir}/client.key"),
        (f"{cert_dir}/client_cert.pem", f"{cert_dir}/client_key.pem"),
        (f"{cert_dir}/server_trust.pem", f"{cert_dir}/server_trust.key"),
        # OPC-UA certificates
        (f"{cert_dir}/opcua_cert.pem", f"{cert_dir}/opcua_key.pem"),
        (f"{cert_dir}/opcua_trust.pem", f"{cert_dir}/opcua_trust.key"),
    ]

    # Also create the same certificates in current directory for local development
    local_cert_dir = Path("certs")
    local_cert_dir.mkdir(exist_ok=True)

    local_certificates = [
        (str(local_cert_dir / "ca.crt"), str(local_cert_dir / "ca.key")),
        (str(local_cert_dir / "client.crt"), str(local_cert_dir / "client.key")),
        (
            str(local_cert_dir / "client_cert.pem"),
            str(local_cert_dir / "client_key.pem"),
        ),
    ]

    all_certificates = certificates_to_generate + local_certificates

    success_count = 0
    for cert_file, key_file in all_certificates:
        if generate_self_signed_cert(cert_file, key_file):
            success_count += 1

    logger.info(
        "🎉 Successfully generated %d/%d certificate pairs",
        success_count,
        len(all_certificates),
    )

    # Verify the certificates exist and have content
    logger.info("\n📋 Certificate verification:")
    for cert_file, key_file in certificates_to_generate:
        cert_path = Path(cert_file)
        key_path = Path(key_file)
        cert_exists = cert_path.exists() and cert_path.stat().st_size > 0
        key_exists = key_path.exists() and key_path.stat().st_size > 0
        status = "✓" if cert_exists and key_exists else "✗"
        logger.info(
            "  %s %s: %s | %s: %s",
            status,
            cert_path.name,
            cert_exists,
            key_path.name,
            key_exists,
        )

    return success_count > 0


if __name__ == "__main__":
    ensure_certificates()

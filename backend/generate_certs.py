import os
import sys
from pathlib import Path

try:
    from OpenSSL import crypto
except ImportError:
    print("Installing pyOpenSSL...")
    os.system(f"{sys.executable} -m pip install pyopenssl")
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
        cert.gmtime_adj_notAfter(365*24*60*60)  # 1 year
        cert.set_issuer(cert.get_subject())
        cert.set_pubkey(k)
        cert.sign(k, 'sha256')
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(cert_file) if os.path.dirname(cert_file) else '.', exist_ok=True)
        os.makedirs(os.path.dirname(key_file) if os.path.dirname(key_file) else '.', exist_ok=True)
        
        # Save certificate
        with open(cert_file, "wb") as f:
            f.write(crypto.dump_certificate(crypto.FILETYPE_PEM, cert))
        print(f"✓ Generated certificate: {cert_file}")
        
        # Save private key
        with open(key_file, "wb") as f:
            f.write(crypto.dump_privatekey(crypto.FILETYPE_PEM, k))
        print(f"✓ Generated private key: {key_file}")
        
        return True
        
    except Exception as e:
        print(f"✗ Failed to generate certificates: {e}")
        return False

def ensure_certificates():
    """Ensure all required certificate files exist"""
    print("🔐 Generating MQTT and OPC-UA certificates...")
    
    cert_dir = "/tmp"
    certificates_to_generate = [
        # MQTT certificates
        ('/tmp/ca.crt', '/tmp/ca.key'),
        ('/tmp/client.crt', '/tmp/client.key'),
        ('/tmp/client_cert.pem', '/tmp/client_key.pem'),
        ('/tmp/server_trust.pem', '/tmp/server_trust.key'),
        
        # OPC-UA certificates  
        ('/tmp/opcua_cert.pem', '/tmp/opcua_key.pem'),
        ('/tmp/opcua_trust.pem', '/tmp/opcua_trust.key'),
    ]
    
    # Also create the same certificates in current directory for local development
    local_cert_dir = "certs"
    if not os.path.exists(local_cert_dir):
        os.makedirs(local_cert_dir, exist_ok=True)
    
    local_certificates = [
        (f"{local_cert_dir}/ca.crt", f"{local_cert_dir}/ca.key"),
        (f"{local_cert_dir}/client.crt", f"{local_cert_dir}/client.key"),
        (f"{local_cert_dir}/client_cert.pem", f"{local_cert_dir}/client_key.pem"),
    ]
    
    all_certificates = certificates_to_generate + local_certificates
    
    success_count = 0
    for cert_file, key_file in all_certificates:
        if generate_self_signed_cert(cert_file, key_file):
            success_count += 1
    
    print(f"🎉 Successfully generated {success_count}/{len(all_certificates)} certificate pairs")
    
    # Verify the certificates exist and have content
    print("\n📋 Certificate verification:")
    for cert_file, key_file in certificates_to_generate:
        cert_exists = os.path.exists(cert_file) and os.path.getsize(cert_file) > 0
        key_exists = os.path.exists(key_file) and os.path.getsize(key_file) > 0
        status = "✓" if cert_exists and key_exists else "✗"
        print(f"  {status} {os.path.basename(cert_file)}: {cert_exists} | {os.path.basename(key_file)}: {key_exists}")
    
    return success_count > 0

if __name__ == "__main__":
    ensure_certificates()

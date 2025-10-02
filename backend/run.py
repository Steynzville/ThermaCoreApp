"""Main application entry point for ThermaCore SCADA API."""
import os

from app import create_app, db

# Create Flask application
app = create_app(os.environ.get('FLASK_ENV', 'development'))


@app.cli.command()
def init_db():
    """Initialize the database with tables and seed data."""
    from sqlalchemy import text
    import sys
    
    print("Creating database tables...")
    
    try:
        # Read and execute schema file
        schema_path = os.path.join(os.path.dirname(__file__), 'migrations', '001_initial_schema.sql')
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
            
        # Execute entire schema at once to preserve PL/pgSQL functions
        db.session.execute(text(schema_sql))
        
        db.session.commit()
        print("✓ Database schema created successfully")
        
        # Read and execute seed data
        seed_path = os.path.join(os.path.dirname(__file__), 'migrations', '002_seed_data.sql')
        with open(seed_path, 'r') as f:
            seed_sql = f.read()
            
        # Execute entire seed file at once
        db.session.execute(text(seed_sql))
                
        db.session.commit()
        print("✓ Seed data inserted successfully")
        print("\nDatabase initialization completed!")
        print("Default admin user: admin / admin123")
        
    except Exception as e:
        db.session.rollback()
        print(f"✗ Error initializing database: {e}")
        sys.exit(1)


@app.cli.command()
def create_admin():
    """Create an admin user."""
    from app.models import User, Role
    import getpass
    
    admin_role = Role.query.filter_by(name='admin').first()
    if not admin_role:
        print("Error: Admin role not found. Please run 'flask init-db' first.")
        return
    
    username = input("Enter admin username: ")
    email = input("Enter admin email: ")
    password = getpass.getpass("Enter admin password: ")
    
    # Check if user already exists
    existing_user = User.query.filter(
        (User.username == username) | (User.email == email)
    ).first()
    
    if existing_user:
        print("Error: User with this username or email already exists.")
        return
    
    # Create admin user
    admin_user = User(
        username=username,
        email=email,
        first_name="Admin",
        last_name="User",
        role_id=admin_role.id
    )
    admin_user.set_password(password)
    
    try:
        db.session.add(admin_user)
        db.session.commit()
        print(f"✓ Admin user '{username}' created successfully!")
    except Exception as e:
        db.session.rollback()
        print(f"✗ Error creating admin user: {e}")


if __name__ == '__main__':
    # Only run in debug mode if FLASK_ENV is set to 'development'
    debug_mode = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)
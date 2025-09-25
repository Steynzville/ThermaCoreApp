"""API documentation generation script for ThermaCore SCADA API."""
import os
import json
from datetime import datetime

from app import create_app


def generate_openapi_spec():
    """Generate OpenAPI specification for the API."""
    
    app = create_app('development')
    
    with app.app_context():
        spec = {
            "openapi": "3.0.0",
            "info": {
                "title": "ThermaCore SCADA API",
                "description": "REST API for ThermaCore SCADA system integration and monitoring",
                "version": "1.0.0",
                "contact": {
                    "name": "ThermaCore API Team",
                    "email": "api@thermacore.com"
                },
                "license": {
                    "name": "MIT",
                    "url": "https://opensource.org/licenses/MIT"
                }
            },
            "servers": [
                {
                    "url": "http://localhost:5000/api/v1",
                    "description": "Development server"
                },
                {
                    "url": "https://api.thermacore.com/api/v1",
                    "description": "Production server"
                }
            ],
            "components": {
                "securitySchemes": {
                    "BearerAuth": {
                        "type": "http",
                        "scheme": "bearer",
                        "bearerFormat": "JWT"
                    }
                },
                "schemas": {
                    "User": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "integer", "example": 1},
                            "username": {"type": "string", "example": "admin"},
                            "email": {"type": "string", "format": "email", "example": "admin@thermacore.com"},
                            "first_name": {"type": "string", "example": "John"},
                            "last_name": {"type": "string", "example": "Doe"},
                            "is_active": {"type": "boolean", "example": True},
                            "created_at": {"type": "string", "format": "date-time"},
                            "updated_at": {"type": "string", "format": "date-time"},
                            "last_login": {"type": "string", "format": "date-time"},
                            "role": {"$ref": "#/components/schemas/Role"}
                        }
                    },
                    "Role": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "integer", "example": 1},
                            "name": {"type": "string", "enum": ["admin", "operator", "viewer"], "example": "admin"},
                            "description": {"type": "string", "example": "System administrator"},
                            "permissions": {
                                "type": "array",
                                "items": {"$ref": "#/components/schemas/Permission"}
                            }
                        }
                    },
                    "Permission": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "integer", "example": 1},
                            "name": {
                                "type": "string", 
                                "enum": ["read_units", "write_units", "delete_units", "read_users", "write_users", "delete_users", "admin_panel"],
                                "example": "read_units"
                            },
                            "description": {"type": "string", "example": "Read access to units"}
                        }
                    },
                    "Unit": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string", "example": "TC001"},
                            "name": {"type": "string", "example": "ThermaCore Unit 001"},
                            "serial_number": {"type": "string", "example": "TC001-2024-001"},
                            "install_date": {"type": "string", "format": "date-time"},
                            "last_maintenance": {"type": "string", "format": "date-time"},
                            "location": {"type": "string", "example": "Site Alpha"},
                            "status": {"type": "string", "enum": ["online", "offline", "maintenance", "error"], "example": "online"},
                            "health_status": {"type": "string", "enum": ["optimal", "warning", "critical"], "example": "optimal"},
                            "water_generation": {"type": "boolean", "example": True},
                            "has_alert": {"type": "boolean", "example": False},
                            "has_alarm": {"type": "boolean", "example": False},
                            "client_name": {"type": "string", "example": "Alpha Industries"},
                            "client_contact": {"type": "string", "example": "John Smith"},
                            "client_email": {"type": "string", "format": "email"},
                            "client_phone": {"type": "string", "example": "+1-555-0101"},
                            "temp_outside": {"type": "number", "format": "float", "example": 25.5},
                            "temp_in": {"type": "number", "format": "float", "example": 24.2},
                            "temp_out": {"type": "number", "format": "float", "example": 5.1},
                            "humidity": {"type": "number", "format": "float", "example": 65.0},
                            "pressure": {"type": "number", "format": "float", "example": 1013.25},
                            "water_level": {"type": "number", "format": "float", "example": 450.0},
                            "battery_level": {"type": "number", "format": "float", "example": 85.0},
                            "current_power": {"type": "number", "format": "float", "example": 3.2},
                            "parasitic_load": {"type": "number", "format": "float", "example": 0.1},
                            "user_load": {"type": "number", "format": "float", "example": 2.8},
                            "created_at": {"type": "string", "format": "date-time"},
                            "updated_at": {"type": "string", "format": "date-time"},
                            "sensors": {
                                "type": "array",
                                "items": {"$ref": "#/components/schemas/Sensor"}
                            }
                        }
                    },
                    "Sensor": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "integer", "example": 1},
                            "unit_id": {"type": "string", "example": "TC001"},
                            "name": {"type": "string", "example": "Temperature Sensor"},
                            "sensor_type": {"type": "string", "example": "temperature"},
                            "unit_of_measurement": {"type": "string", "example": "°C"},
                            "min_value": {"type": "number", "format": "float", "example": -20.0},
                            "max_value": {"type": "number", "format": "float", "example": 50.0},
                            "is_active": {"type": "boolean", "example": True},
                            "created_at": {"type": "string", "format": "date-time"},
                            "updated_at": {"type": "string", "format": "date-time"}
                        }
                    },
                    "SensorReading": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "integer", "example": 1},
                            "sensor_id": {"type": "integer", "example": 1},
                            "timestamp": {"type": "string", "format": "date-time"},
                            "value": {"type": "number", "format": "float", "example": 25.5},
                            "quality": {"type": "string", "enum": ["GOOD", "BAD", "UNCERTAIN"], "example": "GOOD"},
                            "sensor": {"$ref": "#/components/schemas/Sensor"}
                        }
                    },
                    "LoginRequest": {
                        "type": "object",
                        "required": ["username", "password"],
                        "properties": {
                            "username": {"type": "string", "example": "admin"},
                            "password": {"type": "string", "example": "admin123"}
                        }
                    },
                    "TokenResponse": {
                        "type": "object",
                        "properties": {
                            "access_token": {"type": "string"},
                            "refresh_token": {"type": "string"},
                            "expires_in": {"type": "integer", "example": 3600},
                            "user": {"$ref": "#/components/schemas/User"}
                        }
                    },
                    "Error": {
                        "type": "object",
                        "properties": {
                            "error": {"type": "string", "example": "Validation error"},
                            "message": {"type": "string", "example": "Invalid input data"},
                            "details": {"type": "object"}
                        }
                    },
                    "PaginatedResponse": {
                        "type": "object",
                        "properties": {
                            "data": {"type": "array", "items": {}},
                            "page": {"type": "integer", "example": 1},
                            "per_page": {"type": "integer", "example": 50},
                            "total": {"type": "integer", "example": 100},
                            "pages": {"type": "integer", "example": 2},
                            "has_next": {"type": "boolean", "example": True},
                            "has_prev": {"type": "boolean", "example": False}
                        }
                    }
                }
            },
            "paths": {
                "/health": {
                    "get": {
                        "tags": ["System"],
                        "summary": "Health check",
                        "description": "Check if the API is running",
                        "responses": {
                            "200": {
                                "description": "API is healthy",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "properties": {
                                                "status": {"type": "string", "example": "healthy"},
                                                "version": {"type": "string", "example": "1.0.0"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "/auth/login": {
                    "post": {
                        "tags": ["Authentication"],
                        "summary": "User login",
                        "description": "Authenticate user and return JWT tokens",
                        "requestBody": {
                            "required": True,
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/LoginRequest"}
                                }
                            }
                        },
                        "responses": {
                            "200": {
                                "description": "Login successful",
                                "content": {
                                    "application/json": {
                                        "schema": {"$ref": "#/components/schemas/TokenResponse"}
                                    }
                                }
                            },
                            "401": {
                                "description": "Invalid credentials",
                                "content": {
                                    "application/json": {
                                        "schema": {"$ref": "#/components/schemas/Error"}
                                    }
                                }
                            }
                        }
                    }
                },
                "/auth/me": {
                    "get": {
                        "tags": ["Authentication"],
                        "summary": "Get current user",
                        "description": "Get information about the currently authenticated user",
                        "security": [{"BearerAuth": []}],
                        "responses": {
                            "200": {
                                "description": "User information",
                                "content": {
                                    "application/json": {
                                        "schema": {"$ref": "#/components/schemas/User"}
                                    }
                                }
                            },
                            "401": {"$ref": "#/components/responses/Unauthorized"}
                        }
                    }
                },
                "/units": {
                    "get": {
                        "tags": ["Units"],
                        "summary": "Get units",
                        "description": "Get list of units with optional filtering and pagination",
                        "security": [{"BearerAuth": []}],
                        "parameters": [
                            {
                                "name": "page",
                                "in": "query",
                                "schema": {"type": "integer", "minimum": 1, "default": 1},
                                "description": "Page number"
                            },
                            {
                                "name": "per_page",
                                "in": "query",
                                "schema": {"type": "integer", "minimum": 1, "maximum": 100, "default": 50},
                                "description": "Items per page"
                            },
                            {
                                "name": "status",
                                "in": "query",
                                "schema": {"type": "string", "enum": ["online", "offline", "maintenance", "error"]},
                                "description": "Filter by status"
                            },
                            {
                                "name": "health_status",
                                "in": "query",
                                "schema": {"type": "string", "enum": ["optimal", "warning", "critical"]},
                                "description": "Filter by health status"
                            },
                            {
                                "name": "search",
                                "in": "query",
                                "schema": {"type": "string"},
                                "description": "Search in unit name, ID, serial number, or client name"
                            },
                            {
                                "name": "location",
                                "in": "query",
                                "schema": {"type": "string"},
                                "description": "Filter by location"
                            }
                        ],
                        "responses": {
                            "200": {
                                "description": "List of units",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "allOf": [
                                                {"$ref": "#/components/schemas/PaginatedResponse"},
                                                {
                                                    "type": "object",
                                                    "properties": {
                                                        "data": {
                                                            "type": "array",
                                                            "items": {"$ref": "#/components/schemas/Unit"}
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "post": {
                        "tags": ["Units"],
                        "summary": "Create unit",
                        "description": "Create a new unit",
                        "security": [{"BearerAuth": []}],
                        "requestBody": {
                            "required": True,
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "required": ["id", "name", "serial_number", "install_date"],
                                        "properties": {
                                            "id": {"type": "string", "example": "TC004"},
                                            "name": {"type": "string", "example": "ThermaCore Unit 004"},
                                            "serial_number": {"type": "string", "example": "TC004-2024-004"},
                                            "install_date": {"type": "string", "format": "date-time"},
                                            "location": {"type": "string", "example": "Site Delta"},
                                            "client_name": {"type": "string", "example": "Delta Corp"},
                                            "client_contact": {"type": "string", "example": "Jane Doe"},
                                            "client_email": {"type": "string", "format": "email"},
                                            "client_phone": {"type": "string", "example": "+1-555-0104"}
                                        }
                                    }
                                }
                            }
                        },
                        "responses": {
                            "201": {
                                "description": "Unit created successfully",
                                "content": {
                                    "application/json": {
                                        "schema": {"$ref": "#/components/schemas/Unit"}
                                    }
                                }
                            },
                            "400": {"$ref": "#/components/responses/BadRequest"},
                            "409": {
                                "description": "Unit ID or serial number already exists",
                                "content": {
                                    "application/json": {
                                        "schema": {"$ref": "#/components/schemas/Error"}
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "security": [
                {"BearerAuth": []}
            ]
        }
        
        # Add common response references
        spec["components"]["responses"] = {
            "Unauthorized": {
                "description": "Unauthorized - Invalid or missing token",
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/Error"}
                    }
                }
            },
            "Forbidden": {
                "description": "Forbidden - Insufficient permissions",
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/Error"}
                    }
                }
            },
            "BadRequest": {
                "description": "Bad Request - Validation error",
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/Error"}
                    }
                }
            },
            "NotFound": {
                "description": "Not Found",
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/Error"}
                    }
                }
            }
        }
        
        return spec


if __name__ == "__main__":
    # Generate OpenAPI spec
    spec = generate_openapi_spec()
    
    # Create docs directory
    docs_dir = os.path.join(os.path.dirname(__file__), '..', 'docs')
    os.makedirs(docs_dir, exist_ok=True)
    
    # Write OpenAPI spec to file
    spec_file = os.path.join(docs_dir, 'openapi.json')
    with open(spec_file, 'w') as f:
        json.dump(spec, f, indent=2)
    
    print(f"OpenAPI specification generated: {spec_file}")
    
    # Generate HTML documentation
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>ThermaCore SCADA API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui.css" />
    <style>
        html {{
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
        }}
        *, *:before, *:after {{
            box-sizing: inherit;
        }}
        body {{
            margin:0;
            background: #fafafa;
        }}
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui-standalone-preset.js"></script>
    <script>
    window.onload = function() {{
      const ui = SwaggerUIBundle({{
        url: './openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      }})
    }}
    </script>
</body>
</html>
"""
    
    html_file = os.path.join(docs_dir, 'index.html')
    with open(html_file, 'w') as f:
        f.write(html_content)
    
    print(f"HTML documentation generated: {html_file}")
    print("\nTo view the documentation:")
    print(f"1. Serve the docs folder with a web server")
    print(f"2. Or open {html_file} in a browser")
    print(f"3. The OpenAPI spec is also available at {spec_file}")
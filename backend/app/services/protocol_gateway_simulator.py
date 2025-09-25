"""Protocol Gateway simulator for generating test SCADA data."""
import json
import logging
import random
import threading
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

import paho.mqtt.client as mqtt

logger = logging.getLogger(__name__)


class ProtocolGatewaySimulator:
    """Simulates a protocol gateway that generates test SCADA data."""
    
    def __init__(self, mqtt_broker_host='localhost', mqtt_broker_port=1883):
        """Initialize protocol gateway simulator.
        
        Args:
            mqtt_broker_host: MQTT broker hostname
            mqtt_broker_port: MQTT broker port
        """
        self.mqtt_host = mqtt_broker_host
        self.mqtt_port = mqtt_broker_port
        self.client = None
        self.connected = False
        self.running = False
        self._simulation_thread = None
        
        # Simulation configuration
        self.simulation_units = [
            'UNIT001', 'UNIT002', 'UNIT003', 'UNIT004', 'UNIT005'
        ]
        
        self.sensor_configs = {
            'temperature': {
                'base_value': 25.0,
                'variation_range': (-10.0, 40.0),
                'noise_factor': 2.0,
                'unit': '°C'
            },
            'pressure': {
                'base_value': 2.5,
                'variation_range': (0.5, 8.0),
                'noise_factor': 0.5,
                'unit': 'bar'
            },
            'flow_rate': {
                'base_value': 150.0,
                'variation_range': (50.0, 300.0),
                'noise_factor': 20.0,
                'unit': 'L/min'
            },
            'power': {
                'base_value': 75.0,
                'variation_range': (30.0, 120.0),
                'noise_factor': 10.0,
                'unit': 'kW'
            }
        }
        
        # Simulation state for each unit
        self.unit_states = {}
        self.init_unit_states()
    
    def init_unit_states(self):
        """Initialize simulation state for all units."""
        for unit_id in self.simulation_units:
            self.unit_states[unit_id] = {
                'status': 'online',
                'last_values': {},
                'trend_direction': {},
                'anomaly_probability': 0.05,  # 5% chance of anomalous reading
                'fault_state': None
            }
            
            # Initialize last values and trends for each sensor type
            for sensor_type, config in self.sensor_configs.items():
                base_val = config['base_value'] + random.uniform(-config['noise_factor'], config['noise_factor'])
                self.unit_states[unit_id]['last_values'][sensor_type] = base_val
                self.unit_states[unit_id]['trend_direction'][sensor_type] = random.choice([-1, 1])
    
    def connect_mqtt(self) -> bool:
        """Connect to MQTT broker.
        
        Returns:
            True if connection successful
        """
        try:
            self.client = mqtt.Client(client_id="protocol_gateway_simulator")
            self.client.on_connect = self._on_mqtt_connect
            self.client.on_disconnect = self._on_mqtt_disconnect
            
            logger.info(f"Connecting to MQTT broker at {self.mqtt_host}:{self.mqtt_port}")
            self.client.connect(self.mqtt_host, self.mqtt_port, 60)
            self.client.loop_start()
            
            # Wait for connection
            time.sleep(2)
            return self.connected
            
        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker: {e}")
            return False
    
    def _on_mqtt_connect(self, client, userdata, flags, rc):
        """MQTT connection callback."""
        if rc == 0:
            self.connected = True
            logger.info("Protocol gateway simulator connected to MQTT broker")
        else:
            logger.error(f"Failed to connect to MQTT broker, return code {rc}")
    
    def _on_mqtt_disconnect(self, client, userdata, rc):
        """MQTT disconnection callback."""
        self.connected = False
        logger.info("Protocol gateway simulator disconnected from MQTT broker")
    
    def disconnect_mqtt(self):
        """Disconnect from MQTT broker."""
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
            self.connected = False
    
    def generate_sensor_value(self, unit_id: str, sensor_type: str) -> Dict[str, Any]:
        """Generate realistic sensor value with trends and anomalies.
        
        Args:
            unit_id: Unit identifier
            sensor_type: Type of sensor
            
        Returns:
            Dictionary with sensor data
        """
        config = self.sensor_configs[sensor_type]
        unit_state = self.unit_states[unit_id]
        
        # Get last value and trend
        last_value = unit_state['last_values'][sensor_type]
        trend = unit_state['trend_direction'][sensor_type]
        
        # Generate new value with trend
        base_change = random.uniform(0.1, 2.0) * trend
        noise = random.uniform(-config['noise_factor'] * 0.1, config['noise_factor'] * 0.1)
        new_value = last_value + base_change + noise
        
        # Keep within realistic bounds
        min_val, max_val = config['variation_range']
        new_value = max(min_val, min(max_val, new_value))
        
        # Randomly change trend direction
        if random.random() < 0.1:  # 10% chance to change trend
            unit_state['trend_direction'][sensor_type] *= -1
        
        # Check for anomalies
        quality = 'GOOD'
        if random.random() < unit_state['anomaly_probability']:
            # Generate anomalous reading
            if random.random() < 0.5:
                new_value = random.uniform(min_val * 0.5, max_val * 1.2)  # Out of normal range
            quality = 'UNCERTAIN'
        
        # Very rarely generate bad quality
        if random.random() < 0.01:  # 1% chance
            quality = 'BAD'
        
        # Update state
        unit_state['last_values'][sensor_type] = new_value
        
        return {
            'value': round(new_value, 2),
            'quality': quality,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'unit': config['unit']
        }
    
    def publish_sensor_data(self, unit_id: str, sensor_type: str):
        """Generate and publish sensor data to MQTT.
        
        Args:
            unit_id: Unit identifier
            sensor_type: Type of sensor
        """
        if not self.connected:
            logger.warning("Not connected to MQTT broker")
            return
        
        try:
            # Generate sensor data
            sensor_data = self.generate_sensor_value(unit_id, sensor_type)
            
            # Publish to MQTT topic
            topic = f"scada/{unit_id}/{sensor_type}"
            payload = json.dumps(sensor_data)
            
            result = self.client.publish(topic, payload, qos=0)
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.debug(f"Published {unit_id}/{sensor_type}: {sensor_data['value']}")
            else:
                logger.error(f"Failed to publish data to {topic}")
                
        except Exception as e:
            logger.error(f"Error publishing sensor data: {e}")
    
    def simulate_unit_status_change(self, unit_id: str):
        """Occasionally simulate unit status changes.
        
        Args:
            unit_id: Unit identifier
        """
        if random.random() < 0.001:  # Very rare status changes
            current_status = self.unit_states[unit_id]['status']
            
            # Possible status transitions
            if current_status == 'online':
                new_status = random.choice(['maintenance', 'warning'])
            elif current_status in ['maintenance', 'warning']:
                new_status = 'online' if random.random() < 0.7 else 'offline'
            elif current_status == 'offline':
                new_status = 'online'
            else:
                new_status = 'online'
            
            self.unit_states[unit_id]['status'] = new_status
            
            # Publish status change
            if self.connected:
                topic = f"scada/{unit_id}/status"
                status_data = {
                    'status': new_status,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
                self.client.publish(topic, json.dumps(status_data))
                logger.info(f"Unit {unit_id} status changed to: {new_status}")
    
    def simulation_loop(self):
        """Main simulation loop that generates data for all units."""
        logger.info("Starting protocol gateway simulation loop")
        
        while self.running:
            try:
                for unit_id in self.simulation_units:
                    # Generate data for each sensor type
                    for sensor_type in self.sensor_configs.keys():
                        self.publish_sensor_data(unit_id, sensor_type)
                    
                    # Occasionally simulate status changes
                    self.simulate_unit_status_change(unit_id)
                
                # Sleep between simulation cycles
                time.sleep(5)  # Generate data every 5 seconds
                
            except Exception as e:
                logger.error(f"Error in simulation loop: {e}")
                time.sleep(1)
        
        logger.info("Protocol gateway simulation loop stopped")
    
    def start_simulation(self):
        """Start the simulation thread."""
        if self.running:
            logger.warning("Simulation is already running")
            return False
        
        if not self.connected:
            logger.error("Not connected to MQTT broker - cannot start simulation")
            return False
        
        self.running = True
        self._simulation_thread = threading.Thread(target=self.simulation_loop)
        self._simulation_thread.daemon = True
        self._simulation_thread.start()
        
        logger.info("Protocol gateway simulation started")
        return True
    
    def stop_simulation(self):
        """Stop the simulation."""
        if not self.running:
            return
        
        self.running = False
        if self._simulation_thread:
            self._simulation_thread.join(timeout=5)
        
        logger.info("Protocol gateway simulation stopped")
    
    def inject_test_scenario(self, scenario_type: str, unit_id: str = None):
        """Inject specific test scenarios for validation.
        
        Args:
            scenario_type: Type of scenario to inject
            unit_id: Specific unit ID or None for random unit
        """
        if not unit_id:
            unit_id = random.choice(self.simulation_units)
        
        if unit_id not in self.unit_states:
            logger.error(f"Unknown unit ID: {unit_id}")
            return
        
        if scenario_type == 'high_temperature':
            # Inject high temperature alert
            sensor_data = {
                'value': 95.0,  # Above alert threshold
                'quality': 'GOOD',
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'unit': '°C'
            }
            topic = f"scada/{unit_id}/temperature"
            self.client.publish(topic, json.dumps(sensor_data))
            logger.info(f"Injected high temperature scenario for {unit_id}")
        
        elif scenario_type == 'sensor_failure':
            # Inject bad quality data
            sensor_type = random.choice(list(self.sensor_configs.keys()))
            sensor_data = {
                'value': 0.0,
                'quality': 'BAD',
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'unit': self.sensor_configs[sensor_type]['unit']
            }
            topic = f"scada/{unit_id}/{sensor_type}"
            self.client.publish(topic, json.dumps(sensor_data))
            logger.info(f"Injected sensor failure scenario for {unit_id}/{sensor_type}")
        
        elif scenario_type == 'unit_offline':
            # Simulate unit going offline
            self.unit_states[unit_id]['status'] = 'offline'
            status_data = {
                'status': 'offline',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            topic = f"scada/{unit_id}/status"
            self.client.publish(topic, json.dumps(status_data))
            logger.info(f"Injected unit offline scenario for {unit_id}")
    
    def get_status(self) -> Dict[str, Any]:
        """Get simulator status.
        
        Returns:
            Status dictionary
        """
        return {
            'connected': self.connected,
            'running': self.running,
            'mqtt_host': self.mqtt_host,
            'mqtt_port': self.mqtt_port,
            'simulation_units': self.simulation_units.copy(),
            'sensor_types': list(self.sensor_configs.keys()),
            'unit_states': {unit_id: {'status': state['status'], 'last_values': state['last_values']} 
                           for unit_id, state in self.unit_states.items()}
        }
# Instructions for Using `audit_asserts.py`

This document provides instructions on how to use the `audit_asserts.py` script for auditing assertions in the Thermacore application.

## Prerequisites
- Ensure you have Python installed on your system.
- Install the necessary dependencies by running:  
  ```bash
  pip install -r requirements.txt
  ```

## Usage
1. Navigate to the directory containing `audit_asserts.py`:
   ```bash
   cd path/to/thermacoreapp
   ```

2. Run the script using the following command:
   ```bash
   python audit_asserts.py [options]
   ```

### Options
- `--help`: Show help message and exit.
- `--input`: Specify the input file containing assertions.
- `--output`: Specify the output file to store the audit results.

## Example
To run the script with a specific input and output file:
```bash
python audit_asserts.py --input assertions.txt --output audit_results.txt
```

## Notes
- Ensure that the input file is formatted correctly.
- Review the output file for audit results after running the script.

For further assistance, refer to the documentation or contact the development team.
# Project Name

This project is designed to process and generate scripts from various input sources, leveraging Azure services and Electron for a desktop UI. The project includes multiple components for extracting, interpreting, and matching slides, as well as generating scripts in different formats.

## Setup Guidelines

### Prerequisites

- Node.js (v14 or higher)
- Python (v3.7 or higher)
- pip (Python package installer)
- npm (Node package manager)
- Azure account and credentials

### Installation

1. **Clone the repository:**
    ```sh
    git clone <repository-url>
    cd <repository-directory>
    ```

2. **Install Python dependencies:**
    ```sh
    pip install -r requirements.txt
    ```

3. **Install Node.js dependencies:**
    ```sh
    cd screator-ui
    npm install
    ```

4. **Set up Azure credentials:**
    - Create a `config.properties` file in the root directory with your Azure credentials.
    - See config.py for details on the expected properties

5. **Install pre-requirements for pdf2image**
    See https://github.com/Belval/pdf2image for information

### Running the Project

1. **Start the Electron app:**
    ```sh
    cd screator-ui
    npm run start
    ```

2. **Run the script generator:**
    ```sh
    python script_generator.py <input_folder>
    ```

## Architecture Summary

### Directory Structure

- `interpreting/`: Modules for extracting and interpreting slides.
- `lectoring/`: Modules for extracting documents and lectoring scripts.
- `matching/`: Modules for matching slides to the script content
- `screator-ui/`: Electron-based UI for the project.
- `tests/`: Contains unit tests for the project.
- `script_generator.py`: Generates the script after processing automatically, expects the output folder as input
- `script_generator_edited.py`: Generates the script after it has been edited and saved in the UI

### Key Components

- **Script Generator**: Processes input files and creates JSON output files. Written in python
- **Azure Integration**: Uses Azure services for search and document processing.
- **Electron UI**: Provides a desktop interface for managing and generating scripts.
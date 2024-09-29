import unittest
import os
import shutil
import tempfile
from repository import Repository

class TestRepository(unittest.TestCase):

    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.expected_output_folder = os.path.join("output", os.path.basename(self.test_dir))
        
        # Create dummy .docx and .pdf files
        self.docx_file = os.path.join(self.test_dir, '99_test.docx')
        self.pdf_file = os.path.join(self.test_dir, '99_test.pdf')
        
        with open(self.docx_file, 'w') as f:
            f.write('dummy content')
        
        with open(self.pdf_file, 'w') as f:
            f.write('dummy content')
    
    def tearDown(self):
        # Remove the temporary directory after the test
        shutil.rmtree(self.test_dir)
        shutil.rmtree(self.expected_output_folder)
    
    def test_repository_initialization(self):
        # Initialize the Repository class
        repo = Repository(self.test_dir)
        
        # Verify the transcript and slides files
        self.assertEqual(repo.get_transcript_file(), self.docx_file)
        self.assertEqual(repo.get_slides_file(), self.pdf_file)
        
        # Verify the output folder name
        self.assertEqual(repo.folder_name, self.expected_output_folder)
        
        # Verify the script file name
        expected_script_file = os.path.join(self.expected_output_folder, 'test.adoc')
        self.assertEqual(repo.get_script_file(), expected_script_file)

if __name__ == '__main__':
    unittest.main()
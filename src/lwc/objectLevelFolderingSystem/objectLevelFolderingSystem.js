import { LightningElement, wire, track, api } from 'lwc';
import getFolders from '@salesforce/apex/ObjectLevelFolderingSystemController.getFolders';
import getFiles from '@salesforce/apex/ObjectLevelFolderingSystemController.getFiles';
import addOrMoveFiles from '@salesforce/apex/ObjectLevelFolderingSystemController.addOrMoveFiles';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
const columns1 = [
    {
        label: 'Folder Name', fieldName: 'Name', typeAttributes: {
            hideDefaultActions: true,
        }
    },
    {
        initialWidth: 120, type: "button", typeAttributes: {
            label: 'Open',
            name: 'Open',
            title: 'Open',
            disabled: false,
            value: 'open',
            iconPosition: 'middle',
            iconName: 'utility:open_folder'

        }
    },
];
const columns2 = [
    { label: 'File Name', fieldName: 'Title' },
    {
        label: 'Type', fieldName: 'FileType', typeAttributes: {
            hideDefaultActions: true,
        }
    },
    {
        label: 'Size(KB)', fieldName: 'ContentSize', typeAttributes: {
            hideDefaultActions: true,
        }
    },
    {
        initialWidth: 120, type: "button", typeAttributes: {
            label: 'View',
            name: 'View',
            title: 'View',
            disabled: false,
            value: 'view',
            iconPosition: 'middle',
            iconName: 'utility:open'
        }
    },
];
const columns3 = [
    {
        label: 'Folder Name', fieldName: 'Name', typeAttributes: {
            hideDefaultActions: true,
        }
    },

];

export default class ObjectLevelFolderingSystem extends NavigationMixin(LightningElement) {
    columns1 = columns1;
    columns2 = columns2;
    columns3 = columns3;

    @api objectApiName;
    @api recordId;

    @track folders;
    @track files;

    @track isManageModalOpen = false;
    @track isAddFilesModalOpen = false;
    @track disableUploadFiles = true;

    selectedFolder;
    selectedFile;

    get acceptedFormats() {
        return ['.pdf', '.png', '.docx', '.jpg'];
    }

    @wire(getFolders, {
        objectApiName: '$objectApiName',
    })
    success(folders) {
        this.folders = folders;
    }

    closeFiles() {
        this.files = undefined;
    }

    closeManageModal() {
        // to close modal set isModalOpen tarck value as false
        this.isManageModalOpen = false;
    }

    closeAddFilesModal() {
        this.isAddFilesModalOpen = false;
        this.disableUploadFiles = true;
    }

    openFolder(event) {
        this.selectedFolder = event.detail.row;
        getFiles({
            //Send folder id
            folderId: this.selectedFolder.Id,
            recordId: this.recordId
        })
            .then(result => {
                this.files = result.map(file => {
                    file.ContentSize = Math.round((file.ContentSize / 1000));
                    return file;
                });
            })
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error',
                    message: error.message,
                    variant: 'error'
                }));
            });
    }

    handleUploadFinished(event) {
        // Get the list of uploaded files Ids
        let documentIds = event.detail.files.map(uploadedFile => {
            return uploadedFile.documentId;
        });
        let folders = this.template.querySelector(`[data-id="addFilesTable"]`).getSelectedRows();
        addOrMoveFiles({
            //Send Folder
            folders: folders,
            files: documentIds,
            moveFiles: false
        })
            .then(result => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Success!',
                    message: 'File(s) Uploaded!',
                    variant: 'success'
                }));
            })
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error',
                    message: error.message,
                    variant: 'error'
                }));
            });
    }

    viewFile(event) {
        this.selectedFile = event.detail.row.ContentDocumentId;
        this[NavigationMixin.Navigate]({
            type: 'standard__namedPage',
            attributes: {
                pageName: 'filePreview'
            },
            state: {
                // assigning ContentDocumentId to show the preview of file
                selectedRecordId: this.selectedFile
            }
        })
    }

    handleMenuSelect(event) {
        if (event.detail.value === 'Manage Folders') {
            this.isManageModalOpen = true;
        }
        else {
            this.isAddFilesModalOpen = true;
        }
    }
    handleSelectAddFiles() {
        if (this.template.querySelector(`[data-id="addFilesTable"]`).getSelectedRows().length >= 1) {
            this.disableUploadFiles = false;
        }
        else {
            this.disableUploadFiles = true;
        }
    }
}
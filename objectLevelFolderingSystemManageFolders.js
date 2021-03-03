import { LightningElement, wire, track, api } from 'lwc';
import getFolders from '@salesforce/apex/ObjectLevelFolderingSystemController.getFolders';
import getFiles from '@salesforce/apex/ObjectLevelFolderingSystemController.getFiles';
import createFolder from '@salesforce/apex/ObjectLevelFolderingSystemController.createFolder';
import addOrMoveFiles from '@salesforce/apex/ObjectLevelFolderingSystemController.addOrMoveFiles';
import getUncategorized from '@salesforce/apex/ObjectLevelFolderingSystemController.getUncategorizedFiles';
import deleteFolders from '@salesforce/apex/ObjectLevelFolderingSystemController.deleteFolders';
import manageFolders from '@salesforce/customPermission/Manage_Folders';
import CONTENT_OBJECT_FOLDER from '@salesforce/schema/Content_Object_Folder__c';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { reduceErrors } from 'c/lwcUtils'
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

const columns3 = [
    {
        label: 'Folder Name', fieldName: 'Name', typeAttributes: {
            hideDefaultActions: true,
        }
    },

];
const columns4 = [
    {
        label: 'File Name', fieldName: 'Title', typeAttributes: {
            hideDefaultActions: true,
        }
    },
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
];
export default class ObjectLevelFolderingSystemManageFolders extends LightningElement {
    columns1 = columns1;
    columns3 = columns3;
    columns4 = columns4;

    @api objectApiName;
    @api recordId;

    @track folders;
    @track files;
    @track unCatFiles;
    @track disableCreateFolder = true;
    @track disableDeleteFolder = true;
    @track disableMoveFiles = true;
    @track disableCategorizeFiles = true;
    @track disableUploadFiles = true;
    @track selectedTab;

    newFolderName = '';
    contentObjectFolder = CONTENT_OBJECT_FOLDER;
    selectedFolder;
    selectedFile;

    get hasManageFoldersPermission() {
        return manageFolders;
    }

    @wire(getFolders, {
        objectApiName: '$objectApiName',
    })
    success(folders) {
        this.folders = folders;
    }

    closeFiles() {
        this.files = undefined;
        this.disableMoveFiles = true;
    }

    closeManageModal() {
        //Send custom event back to parent component
        const closeModal = new CustomEvent('closemodal');
        this.dispatchEvent(closeModal);
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

    moveFiles() {
        let folders = this.template.querySelector(`[data-id="moveFolders"]`).getSelectedRows();
        let documentIds = this.template.querySelector(`[data-id="moveFiles"]`).getSelectedRows().map(file => {
            return file.ContentDocumentId;
        });
        addOrMoveFiles({
            //Send Folder
            folders: folders,
            files: documentIds,
            moveFiles: true
        })
            .then(result => {
                this.files = undefined;
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Success!',
                    message: 'File(s) Moved!',
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

    categorizeFiles() {
        let folders = this.template.querySelector(`[data-id="unCatFolders"]`).getSelectedRows();
        let documentIds = this.template.querySelector(`[data-id="unCatFiles"]`).getSelectedRows().map(file => {
            return file.ContentDocumentId;
        });
        addOrMoveFiles({
            //Send Folder
            folders: folders,
            files: documentIds,
            moveFiles: false
        })
            .then(result => {
                this.handleGetUncategorized()
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Success!',
                    message: 'File(s) Categorized!',
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

    handleCreateFolder() {
        this.contentObjectFolder.Name = this.newFolderName;
        this.contentObjectFolder.ObjectApiName__c = this.objectApiName;
        createFolder({
            //Send Folder
            folder: this.contentObjectFolder,
        })
            .then(result => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Success!',
                    message: 'Folder(s) Created!',
                    variant: 'success'
                }));
                refreshApex(this.folders);
                this.newFolderName = '';
            })
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error',
                    message: reduceErrors(error)[0],
                    variant: 'error'
                }));
                console.log(JSON.stringify(reduceErrors(error)));
            });
    }

    handleGetUncategorized() {
        getUncategorized({
            //Send record id
            recordId: this.recordId,
            objectApiName: this.objectApiName
        })
            .then(result => {
                this.unCatFiles = result;
            })
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error',
                    message: error.message,
                    variant: 'error'
                }));
            });
    }

    handleDeleteFolders() {
        let selectedFolderIds = this.template.querySelector(`[data-id="deleteFolders"]`).getSelectedRows().map(selectedFolder => {
            return selectedFolder.Id;
        });
        deleteFolders({
            //Send Folders
            folderIds: selectedFolderIds
        })
            .then(result => {
                refreshApex(this.folders);
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Success!',
                    message: 'Folder(s) Deleted!',
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

    handleChangeFolderName(event) {
        this.newFolderName = event.target.value;
        this.newFolderName.length >= 1 ? this.disableCreateFolder = false : this.disableCreateFolder = true;
    }

    handleSelectDeleteFolder() {
        if (this.template.querySelector(`[data-id="deleteFolders"]`).getSelectedRows().length >= 1) {
            this.disableDeleteFolder = false;
        }
        else {
            this.disableDeleteFolder = true;
        }
    }

    handleSelectMoveFiles() {
        if ((this.template.querySelector(`[data-id="moveFiles"]`) != null && this.template.querySelector(`[data-id="moveFiles"]`).getSelectedRows().length >= 1) &&
            this.template.querySelector(`[data-id="moveFolders"]`).getSelectedRows().length >= 1) {
            this.disableMoveFiles = false;
        }
        else {
            this.disableMoveFiles = true;
        }
    }

    handleSelectUncat() {
        if (this.template.querySelector(`[data-id="unCatFiles"]`).getSelectedRows().length >= 1 &&
            this.template.querySelector(`[data-id="unCatFolders"]`).getSelectedRows().length >= 1) {
            this.disableCategorizeFiles = false;
        }
        else {
            this.disableCategorizeFiles = true;
        }
    }
}
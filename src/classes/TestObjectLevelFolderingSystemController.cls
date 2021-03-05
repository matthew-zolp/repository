@isTest
public class TestObjectLevelFolderingSystemController {
    //Setup one Folder under the Account Object with one File attached to one Account record
    @testSetup
    public static void testSetup(){
        Account account1 = new Account();
        account1.Name = 'Test Account One';
        account1.skiptest__c = true;
        insert account1;
        
        Content_Foldering_Ghost__c cfg1 = new Content_Foldering_Ghost__c();
        insert cfg1;
        
        ContentVersion fileOne = new ContentVersion();
        fileOne.Content_Foldering_Ghost__c = cfg1.Id;
        fileOne.Title = 'fileOne';
        fileOne.PathOnClient ='test';
		fileOne.versiondata=EncodingUtil.base64Decode('Unit Test Attachment Body');
        insert fileOne;
        
        ContentDocument documentOne = [SELECT Id FROM ContentDocument LIMIT 1];
        ContentDocumentLink cdl1 = new ContentDocumentLink();
        cdl1.LinkedEntityId = account1.Id;
        cdl1.ContentDocumentId = documentOne.Id;
        insert cdl1;
        
        Content_Object_Folder__c testFolder = new Content_Object_Folder__c();
        testFolder.Name = 'testFolder';
        testFolder.ObjectApiName__c = 'Account';
		insert testFolder;
        
        Content_Object_Connector__c coc1 = new Content_Object_Connector__c();
        coc1.Content_Foldering_Ghost__c = cfg1.Id;
        coc1.Content_Object_Folder__c = testFolder.Id;
        insert coc1;
    }
    //Test retreival of files listed under a specific Object
    @isTest
    public static void testGetFolders(){
        List<Content_Object_Folder__c> cofList = ObjectLevelFolderingSystemController.getFolders('Account');
        system.assertEquals('testFolder', cofList[0].Name);
    }
    //Test retreival of files listed under existing folder
    @isTest
    public static void testGetFiles(){
        Id folderId = [SELECT Id FROM Content_Object_Folder__c WHERE ObjectApiName__c =: 'Account'].Id;
        Id recordId = [SELECT Id FROM Account LIMIT 1].Id;
        List<ContentVersion> cvList = ObjectLevelFolderingSystemController.getFiles(folderId, recordId);
        system.assertEquals(1, cvList.size());
    }
    //Test retreival of uncategorized files on our test Account
    @isTest
    public static void testGetUncategorizedFiles(){
        Id accountOneId = [SELECT Id FROM Account LIMIT 1].Id;
        ContentVersion fileOne = new ContentVersion();
        fileOne.Title = 'fileTwo';
        fileOne.PathOnClient ='test';
		fileOne.versiondata=EncodingUtil.base64Decode('Unit Test Attachment Body');
        insert fileOne;
        
        Id documentOneId = [SELECT Id FROM ContentDocument WHERE LatestPublishedVersionId =: fileOne.Id LIMIT 1].Id;
        
        ContentDocumentLink cdl1 = new ContentDocumentLink();
        cdl1.LinkedEntityId = accountOneId;
        cdl1.ContentDocumentId = documentOneId;
        insert cdl1;
        
        List<ContentVersion> cvList = ObjectLevelFolderingSystemController.getUncategorizedFiles(accountOneId,'Account');
        system.assertEquals(1, cvList.size());
        system.assertEquals('fileTwo', cvList[0].Title);
        
        delete [SELECT Id FROM Content_Object_Connector__c];
        
        List<ContentVersion> cvListUncat = ObjectLevelFolderingSystemController.getUncategorizedFiles(accountOneId,'Account');
        system.assertEquals(2, cvListUncat.size());
    }
    @isTest
    public static void testDeleteFolders(){
        List<Id> folderIds = new List<Id>();
        for(Content_Object_Folder__c cof : [SELECT Id FROM Content_Object_Folder__c]){
            folderIds.add(cof.Id);
        }
        ObjectLevelFolderingSystemController.deleteFolders(folderIds);
        system.assertEquals(0,[SELECT Count() FROM Content_Object_Folder__c]);
    }
    @isTest
    public static void testCreateFolder(){
        Content_Object_Folder__c cof = new Content_Object_Folder__c(Name='New Folder', ObjectApiName__c='Account');
        ObjectLevelFolderingSystemController.createFolder(cof);
        system.assertEquals(2,[SELECT Count() FROM Content_Object_Folder__c]);
    }
    @isTest
    public static void testAddOrMoveFiles(){
        //Test foldering new Files
        Id accountOneId = [SELECT Id FROM Account LIMIT 1].Id;
        List<Id> files = new List<Id>();
        ContentVersion fileTwo = new ContentVersion();
        fileTwo.Title = 'fileTwo';
        fileTwo.PathOnClient ='test';
		fileTwo.versiondata=EncodingUtil.base64Decode('Unit Test Attachment Body');
        insert fileTwo;
        
        Id documentOneId = [SELECT Id FROM ContentDocument WHERE LatestPublishedVersionId =: fileTwo.Id LIMIT 1].Id;
        
        ContentDocumentLink cdl1 = new ContentDocumentLink();
        cdl1.LinkedEntityId = accountOneId;
        cdl1.ContentDocumentId = documentOneId;
        insert cdl1;
        files.add(cdl1.ContentDocumentId);
        
        List<Content_Object_Folder__c> folders = [SELECT Id FROM Content_Object_Folder__c LIMIT 1];
        
        ObjectLevelFolderingSystemController.addOrMoveFiles(folders, files, false);
        
        system.assertEquals(2, ObjectLevelFolderingSystemController.getFiles(folders[0].Id, accountOneId).size());
        
        //Test moving existing files
        List<Content_Object_Folder__c> newCOF = new List<Content_Object_Folder__c>();
        Content_Object_Folder__c cof = new Content_Object_Folder__c(Name='New Folder', ObjectApiName__c='Account');
        ObjectLevelFolderingSystemController.createFolder(cof);
        newCOF.add(cof);
        //Get both files from Test Folder
        List<Id> cvListToMove = new List<Id>(); 
        for(ContentVersion cv : ObjectLevelFolderingSystemController.getFiles(folders[0].Id, accountOneId)){
            cvListToMove.add(cv.ContentDocumentId);
        }
        //Move them to New Folder
        ObjectLevelFolderingSystemController.addOrMoveFiles(newCOF, cvListToMove, true);
		system.assertEquals(2, ObjectLevelFolderingSystemController.getFiles(newCOF[0].Id, accountOneId).size());
    }
}
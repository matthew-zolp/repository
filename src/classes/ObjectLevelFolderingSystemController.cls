public class ObjectLevelFolderingSystemController {
    @AuraEnabled(cacheable=true)
    public static List<Content_Object_Folder__c> getFolders(String objectApiName){
        return [SELECT Id, Name FROM Content_Object_Folder__c WHERE ObjectApiName__c =: objectApiName ORDER BY Name ASC];
    }
    @AuraEnabled
    public static List<ContentVersion> getFiles(String folderId, Id recordId){
        List<Content_Object_Connector__c> cocList = [SELECT Id, Content_Foldering_Ghost__c FROM Content_Object_Connector__c WHERE Content_Object_Folder__c =: folderId];
        List<Id> cfGhostIds = new List<Id>();
        for(Content_Object_Connector__c coc : cocList){
            cfGhostIds.add(coc.Content_Foldering_Ghost__c);
        }
        List<ContentDocumentLink> cdl = [SELECT ContentDocumentId,LinkedEntityId FROM ContentDocumentLink WHERE LinkedEntityId =:recordId];
        List<Id> cdlIds = new List<Id>();
        for(ContentDocumentLink c : cdl){
            cdlIds.add(c.ContentDocumentId);
        }
        return [SELECT Id,ContentDocumentId,Title, FileType, ContentSize FROM ContentVersion WHERE Content_Foldering_Ghost__c IN: cfGhostIds AND ContentDocumentId IN:cdlIds AND IsLatest = true ORDER BY Title ASC] ;
    }
    @AuraEnabled
    public static List<ContentVersion> getUncategorizedFiles(Id recordId, String objectApiName){
        List<ContentVersion> uncategorizedFiles = new List<ContentVersion>();
        List<ContentDocumentLink> cdl = [SELECT ContentDocumentId,LinkedEntityId FROM ContentDocumentLink WHERE LinkedEntityId =:recordId];
        List<Id> cdlIds = new List<Id>();
        for(ContentDocumentLink c : cdl){
            cdlIds.add(c.ContentDocumentId);
        }
        List<ContentVersion> cvList = [SELECT Id,Title, Content_Foldering_Ghost__c, ContentDocumentId, FileType, ContentSize FROM ContentVersion WHERE ContentDocumentId IN: cdlIds AND IsLatest = true ORDER BY CreatedDate ASC];
        Map<Id, ContentVersion> ghostsToCheck = new Map<Id, ContentVersion>();
        for(ContentVersion cv : cvList){
            if(cv.Content_Foldering_Ghost__c == null){
                uncategorizedFiles.add(cv);
            }
            else{
                ghostsToCheck.put(cv.Content_Foldering_Ghost__c, cv);
            }

        }
		List<Content_Foldering_Ghost__c> cfgList = [SELECT Id, (SELECT Id, Content_Object_Folder__r.ObjectApiName__c FROM Content_Object_Connectors__r) FROM Content_Foldering_Ghost__c WHERE Id IN: ghostsToCheck.keySet()];
        for(Content_Foldering_Ghost__c cfg : cfgList){
            if(cfg.Content_Object_Connectors__r.isEmpty()){
                uncategorizedFiles.add(ghostsToCheck.get(cfg.Id));
            }
            else{
                Boolean folderedOnRecord = false;
                for(Content_Object_Connector__c coc : cfg.Content_Object_Connectors__r){
                    if(coc.Content_Object_Folder__r.ObjectApiName__c == objectApiName){
                        folderedOnRecord = true;
                    }
                }
                if(folderedOnRecord == false)uncategorizedFiles.add(ghostsToCheck.get(cfg.Id));
            }
        }
        return uncategorizedFiles;
    }
    @AuraEnabled
    public static void deleteFolders(List<Id> folderIds){
        delete [SELECT Id FROM Content_Object_Folder__c WHERE Id IN: folderIds];
    }
    @AuraEnabled
    public static void createFolder(Content_Object_Folder__c folder){
        insert folder;
    }
    @AuraEnabled
    public static void addOrMoveFiles(List<Content_Object_Folder__c> folders, List<Id> files, Boolean moveFiles){
		//Move section here---> Delete Connectors that already exist on current files before continuing, files will be re-foldered based on selection in the component
        if(moveFiles == true){
			deleteFolderHistory(files);
        }
		//Foldering section below--->
		folderFiles(folders, files);
    }
    public static void deleteFolderHistory(List<Id> files){
        List<ContentVersion> cvList = [SELECT Id, Content_Foldering_Ghost__c FROM ContentVersion WHERE ContentDocumentId IN: files AND IsLatest = true];
        List<Id> ghostIds = new List<Id>();
        for(ContentVersion cv : cvList){
            ghostIds.add(cv.Content_Foldering_Ghost__c);
        }
        delete [SELECT Id FROM Content_Object_Connector__c WHERE Content_Foldering_Ghost__c IN:ghostIds];
    }
    public static void folderFiles(List<Content_Object_Folder__c> folders, List<Id> files){
        List<ContentVersion> cvList = [SELECT Id, Content_Foldering_Ghost__c FROM ContentVersion WHERE ContentDocumentId IN: files AND IsLatest = true];
        List<Content_Foldering_Ghost__c> cfgList = new List<Content_Foldering_Ghost__c>();
        List<Id> ghostIds = new List<Id>(); 
        //Create Content Foldering Ghosts for Files that do not have one. There should only EVER be one CFG per file. The CFG is the anchor for the file to be attached to multiple folders throught the Content Object Connectors
        for(Integer i=0;i<cvList.size();i++){
            if(String.isBlank(cvList[i].Content_Foldering_Ghost__c)){
                Content_Foldering_Ghost__c cfg = new Content_Foldering_Ghost__c();
                cfgList.add(cfg);
            }
        }
        insert cfgList;
        //Add inserted ghost ids to id list
        for(Content_Foldering_Ghost__c cfg : cfgList){
            ghostIds.add(cfg.Id);
        }
        //Attach cfg's to Files that do not have one
        for(Integer i=0;i<cvList.size();i++){
            if(String.isBlank(cvList[i].Content_Foldering_Ghost__c)){
                cvList[i].Content_Foldering_Ghost__c = cfgList[i].Id;
            }
            else{
                //If the file has one, add it to the ghostId list
                ghostIds.add(cvList[i].Content_Foldering_Ghost__c);
            }
        }
        update cvList;
        //Create Content Object Connectors for cfg's to connect them to the folders selected in the Component
        List<Content_Object_Connector__c> cocList = new List<Content_Object_Connector__c>();
        for(Id cfgId : ghostIds){
            for(Content_Object_Folder__c cof : folders){
                Content_Object_Connector__c coc = new Content_Object_Connector__c(Content_Foldering_Ghost__c=cfgId, Content_Object_Folder__c = cof.Id);
                cocList.add(coc);
            }
        }
        insert cocList;
    }
}
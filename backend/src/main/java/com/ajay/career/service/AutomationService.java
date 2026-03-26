package com.ajay.career.service;

import java.util.Map;

public interface AutomationService {
    Map<String, String> generateResume(Map<String, Object> content);

    String getEmailDraft(String role, String vendorEmail, String jd);

    Map<String, Object> getBaseContent();

    Map<String, String> parseJD(String jdText);

    String getFollowUpDraft(String vendorEmail, String role);

    void saveEmailTemplate(String type, String content);

    String getEmailTemplate(String type);
}

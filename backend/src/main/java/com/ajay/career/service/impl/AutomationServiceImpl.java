package com.ajay.career.service.impl;

import com.ajay.career.service.AutomationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AutomationServiceImpl implements AutomationService {
    private static final Logger logger = LoggerFactory.getLogger(AutomationServiceImpl.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final String automationDirPath = "automation-service";
    private final String pythonScript = "test_render.py";
    private final String dataJson = "data/base_content.json";
    private final String templatesDir = "data/templates";

    @Override
    public Map<String, String> generateResume(Map<String, Object> content) {
        Map<String, String> result = new HashMap<>();
        try {
            // 1. Update the JSON file for the Python script
            Path jsonPath = Paths.get(automationDirPath, dataJson);
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(jsonPath.toFile(), content);

            // 2. Run the Python script
            ProcessBuilder pb = new ProcessBuilder("python", pythonScript);
            pb.directory(new File(automationDirPath));
            pb.redirectErrorStream(true);

            Process process = pb.start();

            // Read output to find the generated file path
            String output = new String(process.getInputStream().readAllBytes());
            int exitCode = process.waitFor();

            if (exitCode == 0) {
                result.put("status", "success");
                result.put("message", "Resume generated successfully");
                result.put("output", output);

                // Open the file in explorer
                Pattern pathPattern = Pattern.compile("Rendered OK: (.*\\.docx)");
                Matcher pathMatcher = pathPattern.matcher(output);
                if (pathMatcher.find()) {
                    String filePath = pathMatcher.group(1).trim();
                    new ProcessBuilder("explorer", "/select,", filePath).start();
                }
            } else {
                result.put("status", "error");
                result.put("message", "Python script failed with exit code " + exitCode);
                result.put("output", output);
            }
        } catch (Exception e) {
            logger.error("Error generating resume", e);
            result.put("status", "error");
            result.put("message", e.getMessage());
        }
        return result;
    }

    @Override
    public String getEmailDraft(String role, String vendorEmail, String jd) {
        String subject = "Interested in " + role;
        String bio = "Hi,\n" +
                "I am Ajay Purshotam Thota, a Senior Full Stack Java Developer with 11+ years of experience designing and delivering enterprise-grade applications. My expertise includes Java, Spring Boot, Microservices, REST APIs, SQL/ORM, and CI/CD pipelines, complemented by strong front-end skills with React and Angular . I have extensive experience with cloud platforms (AWS, Azure, OpenShift) and containerization tools (Docker, Kubernetes), along with hands-on proficiency in messaging systems (Kafka, ActiveMQ) and multithreading/concurrency for high-performance solutions. Over the years, I have successfully delivered secure, scalable applications across banking, healthcare, and e-commerce domains.\n"
                +
                "\n" +
                "I have attached my resume for your review, and I would be glad to discuss how my skills and experience align with your team’s needs.\n"
                +
                "\n" +
                "Best Regards,\n" +
                "Ajay Purshotam Thota\n" +
                "📧 ajaythota2209@gmail.com\n" +
                "📞 (314)-648 5540\n" +
                "\n" +
                "----------------------------------------------------------------------------------------------------------------------------\n"
                +
                "Reference:\n" +
                (jd != null ? jd : role);

        String baseUrl = "https://mail.google.com/mail/?view=cm&fs=1";
        return String.format("%s&to=%s&su=%s&body=%s",
                baseUrl,
                encode(vendorEmail),
                encode(subject),
                encode(bio));
    }

    @Override
    public Map<String, Object> getBaseContent() {
        try {
            Path jsonPath = Paths.get(automationDirPath, dataJson);
            if (Files.exists(jsonPath)) {
                return objectMapper.readValue(jsonPath.toFile(),
                        new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {
                        });
            }
        } catch (IOException e) {
            logger.error("Error reading base content", e);
        }
        return new HashMap<>();
    }

    @Override
    public Map<String, String> parseJD(String jdText) {
        Map<String, String> result = new HashMap<>();

        // 1. Extract Email
        Pattern emailPattern = Pattern.compile("[\\w\\.-]+@[\\w\\.-]+\\.\\w+");
        Matcher emailMatcher = emailPattern.matcher(jdText);
        String email = emailMatcher.find() ? emailMatcher.group(0) : "";
        result.put("email", email);

        // 2. Extract Job Title
        Pattern titlePattern = Pattern.compile("(?:Job Title|Role|Position|Title):\\s*(.*)", Pattern.CASE_INSENSITIVE);
        Matcher titleMatcher = titlePattern.matcher(jdText);
        String title = titleMatcher.find() ? titleMatcher.group(1).trim() : "Java Developer";
        result.put("role", title);

        return result;
    }

    @Override
    public String getFollowUpDraft(String vendorEmail, String role) {
        String template = getEmailTemplate("followup");
        if (template.isEmpty()) {
            template = "Hi,\n\nI am checking in on my candidate Ajay Purshotam Thota for the " + role
                    + " position. Any updates?\n\nBest Regards,\nAjay";
        }

        String subject = "Follow up: " + role + " - Ajay Purshotam Thota";
        String baseUrl = "https://mail.google.com/mail/?view=cm&fs=1";
        return String.format("%s&to=%s&su=%s&body=%s",
                baseUrl,
                encode(vendorEmail),
                encode(subject),
                encode(template));
    }

    @Override
    public void saveEmailTemplate(String type, String content) {
        try {
            Path path = Paths.get(automationDirPath, templatesDir, type + ".txt");
            Files.createDirectories(path.getParent());
            Files.writeString(path, content);
        } catch (IOException e) {
            logger.error("Error saving email template: " + type, e);
        }
    }

    @Override
    public String getEmailTemplate(String type) {
        try {
            Path path = Paths.get(automationDirPath, templatesDir, type + ".txt");
            if (Files.exists(path)) {
                return Files.readString(path);
            }
        } catch (IOException e) {
            logger.error("Error reading email template: " + type, e);
        }
        return "";
    }

    private String encode(String value) {
        if (value == null)
            return "";
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}

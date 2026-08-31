/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: agm_records
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `agm_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mc_id` int(11) NOT NULL,
  `file_no` varchar(255) DEFAULT NULL,
  `mc_name` varchar(255) DEFAULT NULL,
  `agm_date` varchar(255) DEFAULT NULL,
  `next_agm_date` varchar(255) DEFAULT NULL,
  `agm_date_vise` varchar(255) DEFAULT NULL,
  `document_path` varchar(255) DEFAULT NULL,
  `document_name` varchar(255) DEFAULT NULL,
  `uploaded_by` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `mc_id` (`mc_id`),
  CONSTRAINT `agm_records_ibfk_1` FOREIGN KEY (`mc_id`) REFERENCES `management_corporations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: calendar_events
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `calendar_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `date` varchar(255) NOT NULL,
  `visibility` varchar(255) DEFAULT 'Only Me',
  `authorId` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: cfiles
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `cfiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `file_no` text NOT NULL,
  `name_of_apartment` text DEFAULT NULL,
  `address` text DEFAULT NULL,
  `date` date DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `complainer_details` text DEFAULT NULL,
  `registered_ccu_file_no` text DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `category` text DEFAULT NULL,
  `title` text DEFAULT NULL,
  `file_type` text DEFAULT NULL,
  `document_path` text DEFAULT NULL,
  `document_name` text DEFAULT NULL,
  `status` text DEFAULT 'New',
  `assigned_department` text DEFAULT NULL,
  `closed_by` text DEFAULT NULL,
  `closed_department` text DEFAULT NULL,
  `closed_reason` text DEFAULT NULL,
  `closed_document_path` text DEFAULT NULL,
  `closed_document_name` text DEFAULT NULL,
  `created_by` text DEFAULT NULL,
  `modified_by` text DEFAULT NULL,
  `history` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `file_no` (`file_no`) USING HASH,
  UNIQUE KEY `cfiles_file_no_unique` (`file_no`) USING HASH
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: chat_messages
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sender_id` int(11) NOT NULL,
  `receiver_id` int(11) DEFAULT NULL,
  `content` text NOT NULL,
  `message_type` varchar(255) DEFAULT 'direct',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `deleted_by_sender` tinyint(1) DEFAULT 0,
  `deleted_by_receiver` tinyint(1) DEFAULT 0,
  `is_read` tinyint(1) DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sender_id` (`sender_id`),
  KEY `receiver_id` (`receiver_id`),
  CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `chat_messages_ibfk_2` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE
  SET
  NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: complaints
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `complaints` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `serial_no` text DEFAULT NULL,
  `letter_date` text DEFAULT NULL,
  `received_ccu` text DEFAULT NULL,
  `mc_no` text DEFAULT NULL,
  `apartment_name` text DEFAULT NULL,
  `complaint_name` text DEFAULT NULL,
  `issue_heading` text DEFAULT NULL,
  `file_marked` tinyint(1) DEFAULT 0,
  `tr_marked` tinyint(1) DEFAULT 0,
  `reply_marked` tinyint(1) DEFAULT 0,
  `remarks` text DEFAULT NULL,
  `category` text DEFAULT NULL,
  `document_path` text DEFAULT NULL,
  `document_name` text DEFAULT NULL,
  `status` text NOT NULL DEFAULT 'New',
  `assigned_department` text DEFAULT NULL,
  `closed_by` text DEFAULT NULL,
  `closed_department` text DEFAULT NULL,
  `closed_reason` text DEFAULT NULL,
  `closed_document_path` text DEFAULT NULL,
  `closed_document_name` text DEFAULT NULL,
  `created_by` text DEFAULT NULL,
  `modified_by` text DEFAULT NULL,
  `history` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `mc_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mc_id` (`mc_id`),
  CONSTRAINT `complaints_ibfk_1` FOREIGN KEY (`mc_id`) REFERENCES `management_corporations` (`id`) ON DELETE
  SET
  NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: customer_histories
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `customer_histories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_no` text NOT NULL,
  `mc_type` text DEFAULT 'MC',
  `action_type` text NOT NULL,
  `description` text DEFAULT NULL,
  `year` int(11) DEFAULT NULL,
  `file_path` text DEFAULT NULL,
  `action_by` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: daily_activities
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `daily_activities` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `activity_date` date NOT NULL,
  `activity_text` text NOT NULL,
  `activity_category` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: discussions
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `discussions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date` datetime DEFAULT NULL,
  `file_no` varchar(255) DEFAULT NULL,
  `appointment` text DEFAULT NULL,
  `complaint` text DEFAULT NULL,
  `respond` text DEFAULT NULL,
  `meeting_date_time` varchar(255) DEFAULT NULL,
  `venue` varchar(255) DEFAULT NULL,
  `reminder_date` datetime DEFAULT NULL,
  `reminder_notes` text DEFAULT NULL,
  `officer` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT 'New',
  `created_by` text DEFAULT NULL,
  `modified_by` text DEFAULT NULL,
  `history` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: management_corporations
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `management_corporations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `file_no` text NOT NULL,
  `name` text NOT NULL,
  `address` text DEFAULT NULL,
  `plan_no` text DEFAULT NULL,
  `units` int(11) DEFAULT NULL,
  `residential_units` int(11) DEFAULT NULL,
  `non_residential_units` int(11) DEFAULT NULL,
  `non_res_shops` int(11) DEFAULT NULL,
  `non_res_office` int(11) DEFAULT NULL,
  `non_res_hotel` int(11) DEFAULT NULL,
  `council_members` text DEFAULT NULL,
  `category` text DEFAULT NULL,
  `year` int(11) DEFAULT NULL,
  `secretary` text DEFAULT NULL,
  `treasurer` text DEFAULT NULL,
  `reg_date` date DEFAULT NULL,
  `old_file_no` text DEFAULT NULL,
  `new_file_no` text DEFAULT NULL,
  `management_corporation_name` text DEFAULT NULL,
  `residential` int(11) DEFAULT NULL,
  `non_residential` int(11) DEFAULT NULL,
  `service_units` int(11) DEFAULT NULL,
  `renewal_period` text DEFAULT NULL,
  `agm_date` text DEFAULT NULL,
  `next_agm_date` text DEFAULT NULL,
  `renewal_date_vise` text DEFAULT NULL,
  `agm_date_vise` text DEFAULT NULL,
  `agm_meeting_type` text DEFAULT NULL,
  `mc` text DEFAULT NULL,
  `engineer` text DEFAULT NULL,
  `ma` text DEFAULT NULL,
  `secretary_unit_no` text DEFAULT NULL,
  `treasurer_unit_no` text DEFAULT NULL,
  `agm_minutes` text DEFAULT NULL,
  `attendance` text DEFAULT NULL,
  `audited_accounts` text DEFAULT NULL,
  `final_accounts` text DEFAULT NULL,
  `building_insurance` text DEFAULT NULL,
  `sinking_fund` text DEFAULT NULL,
  `budget_proposal` text DEFAULT NULL,
  `town` text DEFAULT NULL,
  `municipal_council_pradeshiya_saba` text DEFAULT NULL,
  `certificate_division_file_no` text DEFAULT NULL,
  `land_registry_approved_date` date DEFAULT NULL,
  `declaration_no` text DEFAULT NULL,
  `email_address` text DEFAULT NULL,
  `status` text DEFAULT 'Active',
  `created_by` text DEFAULT NULL,
  `modified_by` text DEFAULT NULL,
  `history` text DEFAULT NULL,
  `services_lift` text DEFAULT NULL,
  `services_fire_agreement` text DEFAULT NULL,
  `services_generator_agreement` text DEFAULT NULL,
  `services_insurance` text DEFAULT NULL,
  `fac_common_parking` text DEFAULT NULL,
  `fac_accessory_car_parcel` text DEFAULT NULL,
  `fac_roof_top` text DEFAULT NULL,
  `fac_gym` text DEFAULT NULL,
  `fac_swimming_pool` text DEFAULT NULL,
  `fac_penth_house` text DEFAULT NULL,
  `fac_restaurant` text DEFAULT NULL,
  `fac_super_market` text DEFAULT NULL,
  `ownership_type` text DEFAULT NULL,
  `government_income_level` text DEFAULT NULL,
  `private_category_override` text DEFAULT NULL,
  `fee_rate_per_unit` double DEFAULT NULL,
  `fee_amount` double DEFAULT NULL,
  `sscl_amount` double DEFAULT NULL,
  `vat_amount` double DEFAULT NULL,
  `total_amount` double DEFAULT NULL,
  `next_renewal_date` date DEFAULT NULL,
  `fac_garden` text DEFAULT NULL,
  `fac_sauna` text DEFAULT NULL,
  `fac_salon` text DEFAULT NULL,
  `fac_golf_tennis` text DEFAULT NULL,
  `fac_day_care` text DEFAULT NULL,
  `fac_lift` text DEFAULT NULL,
  `fac_service_lift` text DEFAULT NULL,
  `fac_club_house` text DEFAULT NULL,
  `fac_canteen` text DEFAULT NULL,
  `mgmt_company_controlled` text DEFAULT NULL,
  `mgmt_company_name` text DEFAULT NULL,
  `mgmt_company_contact` text DEFAULT NULL,
  `secretary_contact` text DEFAULT NULL,
  `secretary_email` text DEFAULT NULL,
  `treasurer_contact` text DEFAULT NULL,
  `treasurer_email` text DEFAULT NULL,
  `written_assurance_fulfilled` text DEFAULT NULL,
  `renewal_payment_status` text DEFAULT NULL,
  `renewal_paid` tinyint(1) DEFAULT 0,
  `renewal_paid_date` text DEFAULT NULL,
  `renewal_paid_amount` double DEFAULT NULL,
  `renewal_paid_year` int(11) DEFAULT NULL,
  `renewal_paid_years` text DEFAULT NULL,
  `renewal_receipt_no` text DEFAULT NULL,
  `acknowledgement_no` text DEFAULT NULL,
  `acknowledgement_date` text DEFAULT NULL,
  `approval_note` text DEFAULT NULL,
  `cl_reg_condo_plan` text DEFAULT NULL,
  `cl_parcels_total` text DEFAULT NULL,
  `cl_parcels_residential` text DEFAULT NULL,
  `cl_parcels_office` text DEFAULT NULL,
  `cl_parcels_shops` text DEFAULT NULL,
  `cl_parcels_hotels` text DEFAULT NULL,
  `cl_parcels_service` text DEFAULT NULL,
  `cl_services_facilities` text DEFAULT NULL,
  `cl_written_assurance` text DEFAULT NULL,
  `cl_photocopy_condo_plan` text DEFAULT NULL,
  `cl_photocopy_condo_plan_date` text DEFAULT NULL,
  `cl_cma_certificate` text DEFAULT NULL,
  `cl_cma_certificate_no` text DEFAULT NULL,
  `cl_cma_certificate_date` text DEFAULT NULL,
  `cl_declaration` text DEFAULT NULL,
  `cl_declaration_no` text DEFAULT NULL,
  `cl_declaration_date` text DEFAULT NULL,
  `cl_agm_minutes` text DEFAULT NULL,
  `cl_agm_minutes_date` text DEFAULT NULL,
  `cl_attendance` text DEFAULT NULL,
  `cl_attendance_total` text DEFAULT NULL,
  `cl_attendance_physically` text DEFAULT NULL,
  `cl_attendance_proxy` text DEFAULT NULL,
  `cl_insurance` text DEFAULT NULL,
  `cl_insurance_from` text DEFAULT NULL,
  `cl_insurance_to` text DEFAULT NULL,
  `cl_owners_list` text DEFAULT NULL,
  `cl_constitution` text DEFAULT NULL,
  `cl_bylaws` text DEFAULT NULL,
  `cl_additional_bylaws` text DEFAULT NULL,
  `cl_checked_by` text DEFAULT NULL,
  `cl_checked_date` text DEFAULT NULL,
  `cl_parcels_total_pg` text DEFAULT NULL,
  `cl_parcels_residential_pg` text DEFAULT NULL,
  `cl_parcels_office_pg` text DEFAULT NULL,
  `cl_parcels_shops_pg` text DEFAULT NULL,
  `cl_parcels_hotels_pg` text DEFAULT NULL,
  `cl_parcels_service_pg` text DEFAULT NULL,
  `cl_services_facilities_pg` text DEFAULT NULL,
  `cl_written_assurance_pg` text DEFAULT NULL,
  `cl_photocopy_condo_plan_pg` text DEFAULT NULL,
  `cl_cma_certificate_pg` text DEFAULT NULL,
  `cl_declaration_pg` text DEFAULT NULL,
  `cl_agm_minutes_pg` text DEFAULT NULL,
  `cl_attendance_pg` text DEFAULT NULL,
  `cl_insurance_pg` text DEFAULT NULL,
  `cl_owners_list_pg` text DEFAULT NULL,
  `cl_constitution_pg` text DEFAULT NULL,
  `cl_bylaws_pg` text DEFAULT NULL,
  `cl_additional_bylaws_pg` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `file_no` (`file_no`) USING HASH,
  UNIQUE KEY `management_corporations_file_no_unique` (`file_no`) USING HASH
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: mcom_records
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `mcom_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `file_no` text NOT NULL,
  `reg_date` date DEFAULT NULL,
  `old_file_no` text DEFAULT NULL,
  `remark` text DEFAULT NULL,
  `new_file_no` text DEFAULT NULL,
  `management_corporation_name` text DEFAULT NULL,
  `address` text DEFAULT NULL,
  `units` text DEFAULT NULL,
  `plan_no` text DEFAULT NULL,
  `secretary` text DEFAULT NULL,
  `secretary_unit_no` text DEFAULT NULL,
  `treasurer` text DEFAULT NULL,
  `treasurer_unit_no` text DEFAULT NULL,
  `renewal_period` text DEFAULT NULL,
  `agm_date` date DEFAULT NULL,
  `agm_minutes` text DEFAULT NULL,
  `attendance` text DEFAULT NULL,
  `audited_account` text DEFAULT NULL,
  `building_insurance` text DEFAULT NULL,
  `active_non_active` text DEFAULT NULL,
  `renewal_date_vise` text DEFAULT NULL,
  `agm_date_vise` text DEFAULT NULL,
  `renewal_status` text DEFAULT NULL,
  `agm_status` text DEFAULT NULL,
  `renewal_paid` tinyint(1) DEFAULT 0,
  `renewal_paid_date` date DEFAULT NULL,
  `renewal_paid_amount` float DEFAULT NULL,
  `renewal_paid_year` int(11) DEFAULT NULL,
  `renewal_paid_years` text DEFAULT NULL,
  `renewal_receipt_no` text DEFAULT NULL,
  `acknowledgement_no` text DEFAULT NULL,
  `acknowledgement_date` date DEFAULT NULL,
  `renewal_payment_status` text DEFAULT NULL,
  `next_renewal_date` date DEFAULT NULL,
  `mc_mcom` text DEFAULT NULL,
  `engineer` text DEFAULT NULL,
  `management_assistant` text DEFAULT NULL,
  `town` text DEFAULT NULL,
  `council` text DEFAULT NULL,
  `certificate_file_no` text DEFAULT NULL,
  `email_address` text DEFAULT NULL,
  `awareness_date` date DEFAULT NULL,
  `category` text DEFAULT NULL,
  `year` int(11) DEFAULT NULL,
  `status` text DEFAULT 'Active',
  `created_by` text DEFAULT NULL,
  `modified_by` text DEFAULT NULL,
  `history` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `file_no` (`file_no`) USING HASH,
  UNIQUE KEY `mcom_records_file_no_unique` (`file_no`) USING HASH
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: notification_reads
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `notification_reads` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `notification_id` int(11) NOT NULL,
  `dismissed_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notification_reads_user_id_notification_id` (`user_id`, `notification_id`),
  KEY `notification_id` (`notification_id`),
  CONSTRAINT `notification_reads_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `notification_reads_ibfk_2` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: notifications
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `target_role` varchar(255) DEFAULT NULL,
  `link` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: registration_payable_invoices
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `registration_payable_invoices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mc_id` int(11) NOT NULL,
  `invoice_number` text NOT NULL,
  `invoice_date` date DEFAULT NULL,
  `registration_date` date DEFAULT NULL,
  `period_start` date DEFAULT NULL,
  `period_end` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `file_no` text DEFAULT NULL,
  `old_file_no` text DEFAULT NULL,
  `new_file_no` text DEFAULT NULL,
  `management_corporation_name` text DEFAULT NULL,
  `category` text DEFAULT NULL,
  `fee_rate_per_unit` double DEFAULT NULL,
  `fee_amount` double DEFAULT NULL,
  `sscl_amount` double DEFAULT NULL,
  `vat_amount` double DEFAULT NULL,
  `total_amount` double DEFAULT NULL,
  `status` text DEFAULT 'Payable',
  `created_by` text DEFAULT NULL,
  `modified_by` text DEFAULT NULL,
  `history` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`) USING HASH,
  UNIQUE KEY `registration_payable_invoices_invoice_number_unique` (`invoice_number`) USING HASH,
  KEY `mc_id` (`mc_id`),
  CONSTRAINT `registration_payable_invoices_ibfk_1` FOREIGN KEY (`mc_id`) REFERENCES `management_corporations` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: renewals
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `renewals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ref_no` text NOT NULL,
  `status` text DEFAULT 'pending_approval',
  `applicant_name` text DEFAULT NULL,
  `applicant_email` text DEFAULT NULL,
  `applicant_phone` text DEFAULT NULL,
  `applicant_nic` text DEFAULT NULL,
  `mc_id` int(11) DEFAULT NULL,
  `mc_type` text DEFAULT NULL,
  `mc_name` text DEFAULT NULL,
  `plan_no` text DEFAULT NULL,
  `years` text DEFAULT NULL,
  `amount` double DEFAULT NULL,
  `reject_reason` text DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `action_by` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ref_no` (`ref_no`) USING HASH,
  UNIQUE KEY `renewals_ref_no_unique` (`ref_no`) USING HASH
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: report_documents
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `report_documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `file_name` text NOT NULL,
  `mime_type` text DEFAULT NULL,
  `size` int(11) DEFAULT NULL,
  `storage_path` text NOT NULL,
  `report_id` int(11) DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `deleted_by` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: roles
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `permissions` text NOT NULL DEFAULT '[]',
  `is_system` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`) USING HASH,
  UNIQUE KEY `roles_name_unique` (`name`) USING HASH
) ENGINE = InnoDB AUTO_INCREMENT = 9 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: settings
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `settings` (
  `key` varchar(255) NOT NULL,
  `value` text NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: system_logs
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `system_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_name` varchar(255) DEFAULT 'System',
  `action` varchar(255) NOT NULL,
  `details` text NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: user_drafts
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `user_drafts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` varchar(255) NOT NULL,
  `draftKey` varchar(255) NOT NULL,
  `draftData` longtext NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_drafts_user_id_draft_key` (`userId`, `draftKey`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: user_preferences
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `user_preferences` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` varchar(255) NOT NULL,
  `prefKey` varchar(255) NOT NULL,
  `prefValue` text NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_preferences_user_id_pref_key` (`userId`, `prefKey`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# SCHEMA DUMP FOR TABLE: users
# ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` text NOT NULL,
  `password` text NOT NULL,
  `name` text NOT NULL,
  `role` text NOT NULL,
  `department` text DEFAULT NULL,
  `designation` text DEFAULT NULL,
  `email` text DEFAULT NULL,
  `avatar_url` text DEFAULT NULL,
  `is_online` tinyint(1) DEFAULT 0,
  `last_active` datetime DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT 0,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`) USING HASH,
  UNIQUE KEY `users_username_unique` (`username`) USING HASH
) ENGINE = InnoDB AUTO_INCREMENT = 23 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: agm_records
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: calendar_events
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: cfiles
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: chat_messages
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: complaints
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: customer_histories
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: daily_activities
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: discussions
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: management_corporations
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: mcom_records
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: notification_reads
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: notifications
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: registration_payable_invoices
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: renewals
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: report_documents
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: roles
# ------------------------------------------------------------

INSERT INTO
  `roles` (
    `id`,
    `name`,
    `permissions`,
    `is_system`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    1,
    'Admin',
    '{\"dashboard\":[\"view\"],\"registration\":[\"view\",\"create\",\"edit\",\"delete\"],\"renewal_approval\":[\"view\"],\"mc\":[\"view\",\"create\",\"edit\",\"delete\",\"checklist\",\"renewal\",\"view_record\",\"history\",\"receipt\"],\"mcom\":[\"view\",\"create\",\"edit\",\"delete\",\"view_record\",\"history\",\"renewal\"],\"cfiles\":[\"view\",\"create\",\"edit\",\"delete\",\"transfer\",\"close\"],\"complains\":[\"view\",\"create\",\"edit\",\"delete\",\"transfer\",\"close\"],\"discussion\":[\"view\",\"create\",\"edit\",\"delete\"],\"records\":[\"view\"],\"reports\":[\"view\"],\"users\":[\"view\",\"create\",\"edit\",\"delete\"],\"profile\":[\"view\",\"edit\"]}',
    0,
    NULL,
    '2026-08-14 03:48:42',
    '2026-08-24 04:11:17'
  );
INSERT INTO
  `roles` (
    `id`,
    `name`,
    `permissions`,
    `is_system`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    2,
    'Chairman',
    '{\"dashboard\":[\"view\"],\"registration\":[\"view\"],\"renewal_approval\":[\"view\"],\"mc\":[\"view\"],\"mcom\":[\"view\"],\"cfiles\":[\"view\",\"create\"],\"complains\":[\"view\",\"create\"],\"discussion\":[\"view\"],\"records\":[\"view\"],\"profile\":[\"view\"],\"reports\":[\"view\"]}',
    0,
    NULL,
    '2026-08-14 03:49:03',
    '2026-08-24 04:11:17'
  );
INSERT INTO
  `roles` (
    `id`,
    `name`,
    `permissions`,
    `is_system`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    3,
    'GM',
    '{\"dashboard\":[\"view\"],\"registration\":[\"view\"],\"renewal_approval\":[\"view\"],\"mc\":[\"view\"],\"mcom\":[\"view\"],\"cfiles\":[\"view\"],\"complains\":[\"view\"],\"discussion\":[\"view\"],\"records\":[\"view\"],\"reports\":[\"view\"],\"profile\":[\"view\"]}',
    0,
    NULL,
    '2026-08-14 03:49:38',
    '2026-08-24 04:11:17'
  );
INSERT INTO
  `roles` (
    `id`,
    `name`,
    `permissions`,
    `is_system`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    4,
    'Deputy General Manager (Regulation)',
    '{\"dashboard\":[\"view\"],\"registration\":[\"view\"],\"renewal_approval\":[\"view\"],\"mc\":[\"view\"],\"mcom\":[\"view\"],\"cfiles\":[\"view\",\"create\"],\"complains\":[\"view\",\"create\"],\"discussion\":[\"view\"],\"records\":[\"view\"],\"reports\":[\"view\"],\"profile\":[\"view\"]}',
    0,
    NULL,
    '2026-08-14 03:51:02',
    '2026-08-24 04:11:17'
  );
INSERT INTO
  `roles` (
    `id`,
    `name`,
    `permissions`,
    `is_system`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    5,
    'Legal Department',
    '{\"cfiles\":[\"view\",\"create\",\"edit\",\"delete\",\"transfer\",\"close\"],\"complains\":[\"delete\",\"edit\",\"create\",\"view\",\"transfer\",\"close\"],\"notifications\":[\"view\"],\"profile\":[\"view\",\"edit\"]}',
    0,
    NULL,
    '2026-08-14 03:51:54',
    '2026-08-31 18:27:27'
  );
INSERT INTO
  `roles` (
    `id`,
    `name`,
    `permissions`,
    `is_system`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    6,
    'Technical Department',
    '{\"cfiles\":[\"view\",\"create\",\"edit\",\"delete\",\"transfer\",\"close\"],\"complains\":[\"view\",\"create\",\"edit\",\"delete\",\"transfer\",\"close\"],\"notifications\":[\"view\"],\"profile\":[\"view\",\"edit\"]}',
    0,
    NULL,
    '2026-08-14 03:52:12',
    '2026-08-24 04:27:54'
  );
INSERT INTO
  `roles` (
    `id`,
    `name`,
    `permissions`,
    `is_system`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    7,
    'MA',
    '{\"cfiles\":[\"view\",\"create\",\"edit\",\"delete\",\"transfer\",\"close\"],\"complains\":[\"view\",\"create\",\"edit\",\"delete\",\"transfer\",\"close\"],\"dashboard\":[\"view\"],\"registration\":[\"view\",\"create\",\"edit\",\"delete\"],\"renewal_approval\":[\"view\"],\"mc\":[\"view\",\"create\",\"edit\",\"delete\",\"checklist\",\"renewal\",\"view_record\",\"history\",\"receipt\"],\"mcom\":[\"view\",\"create\",\"edit\",\"delete\",\"view_record\",\"history\",\"renewal\"],\"discussion\":[\"view\",\"create\",\"edit\",\"delete\"],\"records\":[\"view\"],\"profile\":[\"view\",\"edit\"],\"reports\":[\"view\"]}',
    0,
    NULL,
    '2026-08-14 03:52:37',
    '2026-08-24 04:11:18'
  );
INSERT INTO
  `roles` (
    `id`,
    `name`,
    `permissions`,
    `is_system`,
    `created_by`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    8,
    'AGM',
    '{\"dashboard\":[\"view\"],\"registration\":[\"view\",\"create\",\"delete\",\"edit\",\"approve\"],\"renewal_approval\":[\"view\",\"approve\"],\"mc\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"checklist\",\"renewal\",\"view_record\",\"history\",\"receipt\"],\"mcom\":[\"delete\",\"view\",\"create\",\"edit\",\"approve\",\"view_record\",\"history\"],\"cfiles\":[\"view\",\"create\",\"edit\",\"delete\",\"transfer\",\"close\"],\"complains\":[\"view\",\"create\",\"edit\",\"delete\",\"transfer\",\"close\"],\"discussion\":[\"view\",\"create\",\"edit\",\"delete\"],\"records\":[\"view\"],\"reports\":[\"view\"],\"profile\":[\"view\",\"edit\"],\"notifications\":[\"view\"],\"customer_history\":[\"view\"]}',
    0,
    NULL,
    '2026-08-14 03:53:44',
    '2026-08-25 06:30:43'
  );

# ------------------------------------------------------------
# DATA DUMP FOR TABLE: settings
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: system_logs
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: user_drafts
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: user_preferences
# ------------------------------------------------------------


# ------------------------------------------------------------
# DATA DUMP FOR TABLE: users
# ------------------------------------------------------------

INSERT INTO
  `users` (
    `id`,
    `username`,
    `password`,
    `name`,
    `role`,
    `department`,
    `designation`,
    `email`,
    `avatar_url`,
    `is_online`,
    `last_active`,
    `is_deleted`,
    `created_at`
  )
VALUES
  (
    1,
    'admin',
    '$2b$10$CPmojj0RRTOVZ.uyMcihDu9zOVF3aEHBN6xCa8Enu.y/hV4v7x6FC',
    'Mr. G.A. Upul Thushara Sampath',
    'Admin',
    'IT / System',
    'Management Information Systems Officer',
    NULL,
    '/uploads/avatars/user-1-1786679245019.jpg',
    1,
    '2026-08-31 18:53:28',
    0,
    '2026-08-14 03:34:29'
  );
INSERT INTO
  `users` (
    `id`,
    `username`,
    `password`,
    `name`,
    `role`,
    `department`,
    `designation`,
    `email`,
    `avatar_url`,
    `is_online`,
    `last_active`,
    `is_deleted`,
    `created_at`
  )
VALUES
  (
    2,
    'agm',
    '$2b$10$QxQAlvVHUXFbsdr5sjSAseXKypa0kt6xN.J59rGjS6l5d/JbhR.s6',
    'Mrs. Samantha Ampagala',
    'AGM',
    'CCU',
    'Assistant General Manager - CCU',
    NULL,
    '/uploads/avatars/user-16-1786682302986.jpg',
    0,
    '2026-08-31 18:10:03',
    0,
    '2026-08-14 04:36:42'
  );
INSERT INTO
  `users` (
    `id`,
    `username`,
    `password`,
    `name`,
    `role`,
    `department`,
    `designation`,
    `email`,
    `avatar_url`,
    `is_online`,
    `last_active`,
    `is_deleted`,
    `created_at`
  )
VALUES
  (
    3,
    'gm',
    '$2b$10$vlF9P8GOZg97cj8kt4DKE.EX18jnR6cmOZDVLgQS4u53NdZFfR4u.',
    'Archt. Kapila Priyantha',
    'GM',
    'Other',
    'General Manager',
    NULL,
    '/uploads/avatars/user-17-1786682391142.png',
    1,
    '2026-08-14 10:37:24',
    0,
    '2026-08-14 04:39:51'
  );
INSERT INTO
  `users` (
    `id`,
    `username`,
    `password`,
    `name`,
    `role`,
    `department`,
    `designation`,
    `email`,
    `avatar_url`,
    `is_online`,
    `last_active`,
    `is_deleted`,
    `created_at`
  )
VALUES
  (
    4,
    'chairman',
    '$2b$10$ZVYxSjjhupK0CVUw69kGIeJzqFd2HftZtTVf417hmrrFi12r5qed6',
    'Mr.Nishan Nanayakkara',
    'Chairman',
    'Other',
    'Chairman',
    NULL,
    '/uploads/avatars/user-18-1786682455338.png',
    0,
    NULL,
    0,
    '2026-08-14 04:40:46'
  );
INSERT INTO
  `users` (
    `id`,
    `username`,
    `password`,
    `name`,
    `role`,
    `department`,
    `designation`,
    `email`,
    `avatar_url`,
    `is_online`,
    `last_active`,
    `is_deleted`,
    `created_at`
  )
VALUES
  (
    5,
    'hashara',
    '$2b$10$LKw6uXCx1BdyDyfi3WfD8udIJxpVWcwuDBGM7otlFYBl6jJM2C602',
    'Ms.Hashara Gamage',
    'MA',
    'CCU',
    'Managment Asssistant',
    NULL,
    '/uploads/avatars/user-19-1786682714785.jpg',
    1,
    '2026-08-24 07:51:37',
    0,
    '2026-08-14 04:45:14'
  );
INSERT INTO
  `users` (
    `id`,
    `username`,
    `password`,
    `name`,
    `role`,
    `department`,
    `designation`,
    `email`,
    `avatar_url`,
    `is_online`,
    `last_active`,
    `is_deleted`,
    `created_at`
  )
VALUES
  (
    6,
    'chandana',
    '$2b$10$1M0OmS8fLFjB/tMmRrtSfuMF2l6pZj1WfbFJKkX55GTLTNpl/gT46',
    'Mr.H.H.C.Hewanadugala',
    'MA',
    'CCU',
    'Managment Asssistant',
    NULL,
    '/uploads/avatars/user-20-1786682804277.jpg',
    0,
    NULL,
    0,
    '2026-08-14 04:46:44'
  );
INSERT INTO
  `users` (
    `id`,
    `username`,
    `password`,
    `name`,
    `role`,
    `department`,
    `designation`,
    `email`,
    `avatar_url`,
    `is_online`,
    `last_active`,
    `is_deleted`,
    `created_at`
  )
VALUES
  (
    7,
    'suranga',
    '$2b$10$Y9qWj9E7/SqVb4W9zBh0wOFt6eCB5jlicxBMHUefrGVTrwSfxvJhG',
    'Mr. N.M.H.Suranga',
    'MA',
    'CCU',
    'Managment Asssistant',
    NULL,
    '/uploads/avatars/user-21-1786682899864.jpg',
    0,
    NULL,
    0,
    '2026-08-14 04:48:19'
  );
INSERT INTO
  `users` (
    `id`,
    `username`,
    `password`,
    `name`,
    `role`,
    `department`,
    `designation`,
    `email`,
    `avatar_url`,
    `is_online`,
    `last_active`,
    `is_deleted`,
    `created_at`
  )
VALUES
  (
    8,
    'kapila',
    '$2b$10$2ZU9tbtM4FFtjfdHP/VcPeABc.P6XQefCAaiI6s/Om7wm9nMxIJ3.',
    'Mr. W.D.S. Kapila Fernando',
    'MA',
    'CCU',
    'Managment Asssistant',
    NULL,
    '/uploads/avatars/user-22-1786685105365.jpg',
    0,
    NULL,
    0,
    '2026-08-14 04:49:25'
  );
INSERT INTO
  `users` (
    `id`,
    `username`,
    `password`,
    `name`,
    `role`,
    `department`,
    `designation`,
    `email`,
    `avatar_url`,
    `is_online`,
    `last_active`,
    `is_deleted`,
    `created_at`
  )
VALUES
  (
    9,
    'anushka',
    '$2b$10$P6MpXM7R1plzF3NZ5UKrTuAzkS/3yx9p45OT4ie29lEmBrx3/S/gq',
    'Mr. A.G.A.Priyadarshana',
    'MA',
    'CCU',
    'Managment Asssistant',
    NULL,
    '/uploads/avatars/user-23-1786683019029.jpg',
    0,
    NULL,
    0,
    '2026-08-14 04:50:18'
  );
INSERT INTO
  `users` (
    `id`,
    `username`,
    `password`,
    `name`,
    `role`,
    `department`,
    `designation`,
    `email`,
    `avatar_url`,
    `is_online`,
    `last_active`,
    `is_deleted`,
    `created_at`
  )
VALUES
  (
    10,
    'chaminda',
    '$2b$10$50K0ZvM3sJ1VtXHfSUn5QeAz/TWiIPPfKlogXPbo1Xy9PKY7ijmYO',
    'Mr. D.A.Chaminda',
    'MA',
    'CCU',
    'Managment Asssistant',
    NULL,
    '/uploads/avatars/user-24-1786685446089.jpg',
    0,
    NULL,
    0,
    '2026-08-14 04:52:28'
  );
INSERT INTO
  `users` (
    `id`,
    `username`,
    `password`,
    `name`,
    `role`,
    `department`,
    `designation`,
    `email`,
    `avatar_url`,
    `is_online`,
    `last_active`,
    `is_deleted`,
    `created_at`
  )
VALUES
  (
    11,
    'nithya',
    '$2b$10$Um2gFHQO7ZLcwPD7W1VLZ.d4ptkmxhz9YuNoExHFiHNmJKcOrak6a',
    'Mrs. N.Jeyakumar',
    'MA',
    'CCU',
    'Managment Asssistant',
    NULL,
    '/uploads/avatars/user-25-1786694859579.jpg',
    0,
    NULL,
    0,
    '2026-08-14 08:07:39'
  );
INSERT INTO
  `users` (
    `id`,
    `username`,
    `password`,
    `name`,
    `role`,
    `department`,
    `designation`,
    `email`,
    `avatar_url`,
    `is_online`,
    `last_active`,
    `is_deleted`,
    `created_at`
  )
VALUES
  (
    12,
    'stela',
    '$2b$10$wPfFdmJeo.UFLve4xXKKI.dC8lJn85DxS7Tx1kIt8wt6GjnIYlbu.',
    'Ms.Meri stela',
    'MA',
    'CCU',
    'Managment Asssistant',
    NULL,
    NULL,
    0,
    NULL,
    0,
    '2026-08-14 08:09:21'
  );
INSERT INTO
  `users` (
    `id`,
    `username`,
    `password`,
    `name`,
    `role`,
    `department`,
    `designation`,
    `email`,
    `avatar_url`,
    `is_online`,
    `last_active`,
    `is_deleted`,
    `created_at`
  )
VALUES
  (
    13,
    'dilhani',
    '$2b$10$LV7MmztaAXErryzB2buwzO2.NbuwJlMuOcLgyWPeSMVKrbLVJWXfG',
    'Ms.R.G.Dilhani Dhammika',
    'MA',
    'CCU',
    'Managment Asssistant',
    NULL,
    NULL,
    0,
    NULL,
    0,
    '2026-08-14 08:13:20'
  );
INSERT INTO
  `users` (
    `id`,
    `username`,
    `password`,
    `name`,
    `role`,
    `department`,
    `designation`,
    `email`,
    `avatar_url`,
    `is_online`,
    `last_active`,
    `is_deleted`,
    `created_at`
  )
VALUES
  (
    14,
    'udaya',
    '$2b$10$UvHv1jE/tGpYCUbsEPtFK.DwGpumYhSn0x8yZ0z9wTEU3zYM8.tUK',
    'Mr.udaya',
    'MA',
    'CCU',
    'Managment Asssistant',
    NULL,
    '/uploads/avatars/user-28-1786695296625.jpg',
    0,
    NULL,
    0,
    '2026-08-14 08:14:56'
  );
INSERT INTO
  `users` (
    `id`,
    `username`,
    `password`,
    `name`,
    `role`,
    `department`,
    `designation`,
    `email`,
    `avatar_url`,
    `is_online`,
    `last_active`,
    `is_deleted`,
    `created_at`
  )
VALUES
  (
    15,
    'upul',
    '$2b$10$G18SjQhy8DBrjQiy/LRVwuiXQczdQSjd.urfMBC3KZlmO/dCtBi.e',
    'mr.upul',
    'MA',
    'CCU',
    'Managment Asssistant',
    NULL,
    NULL,
    0,
    NULL,
    0,
    '2026-08-14 08:15:15'
  );
INSERT INTO
  `users` (
    `id`,
    `username`,
    `password`,
    `name`,
    `role`,
    `department`,
    `designation`,
    `email`,
    `avatar_url`,
    `is_online`,
    `last_active`,
    `is_deleted`,
    `created_at`
  )
VALUES
  (
    16,
    'pelpita',
    '$2b$10$ZQGaVkdfU9uBOpXryT8AN.yM.Y/PlqrNWDeXz6UiKCChsTsVoqpKy',
    'Mrs.J.A.N.P.W. Pelpita',
    'Technical Department',
    'Technical',
    'Assistant General Manager (Regulatory)',
    NULL,
    NULL,
    1,
    '2026-08-31 18:34:40',
    0,
    '2026-08-14 08:19:23'
  );
INSERT INTO
  `users` (
    `id`,
    `username`,
    `password`,
    `name`,
    `role`,
    `department`,
    `designation`,
    `email`,
    `avatar_url`,
    `is_online`,
    `last_active`,
    `is_deleted`,
    `created_at`
  )
VALUES
  (
    17,
    'ranjala',
    '$2b$10$8ig.qWtG/p7J.if3uyUyKubbdqiVKfwy/l8HRnN5oDtUkK6MhvxVO',
    'Miss.S.H.Ranjala Priyangika Hewage',
    'Technical Department',
    'Technical',
    'Assistant General Manager (Operations / Maintenance)',
    NULL,
    NULL,
    0,
    NULL,
    0,
    '2026-08-14 08:20:35'
  );
INSERT INTO
  `users` (
    `id`,
    `username`,
    `password`,
    `name`,
    `role`,
    `department`,
    `designation`,
    `email`,
    `avatar_url`,
    `is_online`,
    `last_active`,
    `is_deleted`,
    `created_at`
  )
VALUES
  (
    18,
    'sajeewa',
    '$2b$10$55dCPKvHgiNCDyd87VG.Ru4xC7YMB6o13GAQZKT/Tvx7xxUq66VdS',
    'Mr. W.H. Sajeewa Chandana Silva',
    'Technical Department',
    'Technical',
    'Assistant General Manager (Operations / Maintenance)',
    NULL,
    NULL,
    0,
    NULL,
    0,
    '2026-08-14 08:21:22'
  );
INSERT INTO
  `users` (
    `id`,
    `username`,
    `password`,
    `name`,
    `role`,
    `department`,
    `designation`,
    `email`,
    `avatar_url`,
    `is_online`,
    `last_active`,
    `is_deleted`,
    `created_at`
  )
VALUES
  (
    19,
    'harshani',
    '$2b$10$FJyAC9Pz7rp1.dK537bppe21Th9nae8RCSj73.xFawuIgNRruwXoy',
    'Mrs. D.A.T. Harshani',
    'Technical Department',
    'Technical',
    'Assistant General Manager (Operations / Maintenance)',
    NULL,
    NULL,
    0,
    NULL,
    0,
    '2026-08-14 08:32:44'
  );
INSERT INTO
  `users` (
    `id`,
    `username`,
    `password`,
    `name`,
    `role`,
    `department`,
    `designation`,
    `email`,
    `avatar_url`,
    `is_online`,
    `last_active`,
    `is_deleted`,
    `created_at`
  )
VALUES
  (
    20,
    'sujani',
    '$2b$10$f6hsEv6/Zuasdd8YLpt5pu/HT4tNlGASsPE99mdNTGH9vUfE7Anwe',
    'Mrs. Sujani Kosala Ranaweera',
    'Technical Department',
    'Technical',
    'Assistant General Manager (Operations / Maintenance',
    NULL,
    NULL,
    0,
    NULL,
    0,
    '2026-08-14 08:33:47'
  );
INSERT INTO
  `users` (
    `id`,
    `username`,
    `password`,
    `name`,
    `role`,
    `department`,
    `designation`,
    `email`,
    `avatar_url`,
    `is_online`,
    `last_active`,
    `is_deleted`,
    `created_at`
  )
VALUES
  (
    21,
    'somaratne',
    '$2b$10$.1ymmDe5NMhDucECFBT1j.oRD7.UUDaOFlczjYngsnh.sTo.sgq4m',
    'Mrs. U.S.I. Somaratne',
    'Legal Department',
    'Legal',
    'S.General Manager (Legal)',
    NULL,
    NULL,
    0,
    '2026-08-31 18:49:28',
    0,
    '2026-08-14 08:34:36'
  );
INSERT INTO
  `users` (
    `id`,
    `username`,
    `password`,
    `name`,
    `role`,
    `department`,
    `designation`,
    `email`,
    `avatar_url`,
    `is_online`,
    `last_active`,
    `is_deleted`,
    `created_at`
  )
VALUES
  (
    22,
    'thanuja',
    '$2b$10$r/iA8rprkI/BEEnDG4sP0eHbse8jsyVEsgRjcBv11T0H1FF4VtO0e',
    'Mrs. T.M. Thanuja Tennakoon',
    'Legal Department',
    'Legal',
    'S.General Manager (Legal)',
    NULL,
    NULL,
    0,
    NULL,
    0,
    '2026-08-14 08:37:56'
  );

/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

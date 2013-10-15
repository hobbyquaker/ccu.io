
CREATE TABLE IF NOT EXISTS `datapoints` (
  `id` int(11) NOT NULL,
  `val` text NOT NULL,
  `ack` tinyint(1) NOT NULL,
  `timestamp` datetime NOT NULL,
  `lastchange` datetime NOT NULL,
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


CREATE TABLE IF NOT EXISTS `events` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `val` text NOT NULL,
  `ack` tinyint(1) NOT NULL,
  `timestamp` datetime NOT NULL,
  `lastchange` datetime NOT NULL,
  KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



CREATE TABLE IF NOT EXISTS `objects` (
  `id` int(11) NOT NULL,
  `parent` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `typeName` varchar(255) NOT NULL,
  `info` varchar(255) NOT NULL,
  `hssType` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `interface` varchar(255) NOT NULL,
  `valueMin` varchar(255) NOT NULL,
  `valueMax` varchar(255) NOT NULL,
  `valueUnit` varchar(255) NOT NULL,
  `valueType` int(11) NOT NULL,
  `valueSubType` int(11) NOT NULL,
  `valueList` text NOT NULL,
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `refs` (
  `enum_id` int(11) NOT NULL,
  `object_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;